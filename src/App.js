// App.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CosmographProvider, Cosmograph, CosmographTimeline } from '@cosmograph/react';

import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { TableView } from './TableView';
import { LogsPanel } from './LogsPanel';
import { ParamsPanel } from './ParamsPanel';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { v4 as uuidv4 } from 'uuid';

import { ChatOllama } from "@langchain/ollama";

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const SYSTEM_PROMPT = `You are a helpful assistant. Your task is to extract relationships from the provided text and format them as a list of connections. Respond ONLY with the connections within <nodes>...</nodes> tags, where each connection is inside a <node> tag like this: <node><from_node>ENTITY_A</from_node><relationship>RELATIONSHIP_TYPE</relationship><to_node>ENTITY_B</to_node></node>. Do not include explanations or any other text outside the <nodes> tags.`;
const USER_PROMPT_TEMPLATE = `Extract the relationships from the following text:\n\n{user_text}`;
const CHUNK_SIZE = 1024;
const TEMPERATURE = 0.5;


export default function App() {
  const [text, setText] = useState('');
  const [logs, setLogs] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsList, setModelsList] = useState([]);
  const [appParams, setAppParams] = useState({
    ollamaUrl: DEFAULT_OLLAMA_URL,
    modelName: '',
    temperature: TEMPERATURE, // Store the temperature
    systemPrompt: SYSTEM_PROMPT, // Store the system prompt
    instructionPromptTemplate: USER_PROMPT_TEMPLATE, // Store the instruction prompt template
    chunkSize: CHUNK_SIZE
  });
  const colors = ['#FF5733', '#33FF57', '#3357FF', '#F1C40F', '#8E44AD', '#E74C3C', '#3498DB'];

useEffect(() => {
    const fetchModels = async () => {
      if (!appParams.ollamaUrl) {
        setLogs(prev => [...prev, 'Ollama URL is not set. Cannot fetch models.']);
        setModelsList([]);
        setAppParams(prev => ({ ...prev, modelName: '' })); // Reset model selection
        return;
      }

      setLoadingModels(true);
      setLogs(prev => [...prev, `Workspaceing models from ${appParams.ollamaUrl}...`]);
      setModelsList([]); // Clear previous models list
      setAppParams(prev => ({ ...prev, modelName: '' })); // Reset model selection during fetch

      try {
        const response = await axios.get(`${appParams.ollamaUrl}/api/tags`);
        if (response.data && Array.isArray(response.data.models)) {
            const fetchedModels = response.data.models.map(model => ({
                name: model.name,   // Used for display and selection identifier
                alias: model.model, // Used for the 'model' parameter in ChatOllama
                type: 'ollama'      // Assuming all are ollama type
            }));
            setModelsList(fetchedModels);
            setLogs(prev => [...prev, `Successfully fetched ${fetchedModels.length} models.`]);

            // Set the default selected model AFTER fetching
            if (fetchedModels.length > 0) {
                setAppParams(prevParams => ({
                    ...prevParams,
                    // Select the first model by default, or try to keep the previous one if it exists
                    modelName: fetchedModels.find(m => m.name === prevParams.modelName)?.name || fetchedModels[0].name
                }));
            } else {
                 setLogs(prev => [...prev, `No models found at ${appParams.ollamaUrl}. Please ensure Ollama is running and models are installed.`]);
                 setAppParams(prev => ({ ...prev, modelName: '' })); // Ensure modelName is empty if no models
            }
        } else {
            throw new Error('Invalid response structure from Ollama API');
        }
      } catch (error) {
          console.error("Error fetching Ollama models:", error);
          const errorMsg = error.response ? `${error.message} (Status: ${error.response.status})` : error.message;
          setLogs(prev => [...prev, `Error fetching models from ${appParams.ollamaUrl}: ${errorMsg}. Using empty list.`]);
          setModelsList([]); // Set to empty on error
          setAppParams(prev => ({ ...prev, modelName: '' })); // Clear model selection
      } finally {
          setLoadingModels(false);
      }
    };

    fetchModels();
    // Dependency array includes appParams.ollamaUrl to re-fetch if the URL changes
  }, [appParams.ollamaUrl]);

  // Memoized Ollama model instance
  const model = useMemo(() => {
    // Ensure a model is selected and the list is available
    if (!appParams.modelName || modelsList.length === 0) {
        console.log("Model creation skipped: No model selected or model list empty.");
        return null;
    }

    const selectedModelInfo = modelsList.find(m => m.name === appParams.modelName);

    // Handle case where selected model is somehow not in the fetched list anymore
    if (!selectedModelInfo) {
        console.warn(`Selected model "${appParams.modelName}" not found in the current models list.`);
         // Optionally reset selection or log error
         // setAppParams(prev => ({ ...prev, modelName: '' })); // Reset if model vanishes
        return null;
    }

    const modelType = selectedModelInfo.type;
    const modelAlias = selectedModelInfo.alias; // Use alias for the constructor

    console.log(`Creating model instance for: ${appParams.modelName} (Alias: ${modelAlias}) using URL: ${appParams.ollamaUrl}`);

    if (modelType === 'ollama') {
        try {
            // Pass baseUrl to the ChatOllama constructor
            return new ChatOllama({
                baseUrl: appParams.ollamaUrl,
                model: modelAlias,
                temperature: appParams.temperature
            });
        } catch (error) {
            console.error("Error creating ChatOllama instance:", error);
            setLogs(prev => [...prev, `Error creating Ollama client for ${modelAlias}: ${error.message}`]);
            return null; // Return null on instantiation error
        }
    } else {
        console.warn(`Unsupported model type: ${modelType}`);
        return null; // Return null for unsupported types
    }
    // Dependencies: Recreate model if URL, selected model name, temperature, or the list itself changes
  }, [appParams.ollamaUrl, appParams.modelName, appParams.temperature, modelsList]);

  const handleGenerate = async () => {
    // --- Pre-generation Checks ---
    if (loading) return; // Prevent multiple simultaneous runs

    if (!model) {
        setLogs(prev => [...prev, "Error: Model is not initialized. Check Ollama URL, ensure models are fetched, and select a model."]);
        return;
    }
    if (!appParams.modelName) {
         setLogs(prev => [...prev, "Error: No model selected. Please select a model from the list."]);
         return;
    }
     if (!text.trim()) {
         setLogs(prev => [...prev, "Error: Input text is empty."]);
         return;
     }


    // --- Start Generation ---
    setLoading(true);
    setGraphData({ nodes: [], edges: [] }); // Clear previous graph
    setTableData([]);                     // Clear previous table
    setLogs([`Starting graph generation with model ${appParams.modelName} at ${appParams.ollamaUrl}...`]);
    setLogs(prev => [...prev, `Parameters: Temp=${appParams.temperature}, ChunkSize=${appParams.chunkSize}`]);

    let allExtractedEdges = [];
    const overallNodeSet = new Set();

    try {
      const chunkSize = parseInt(appParams.chunkSize, 10) || CHUNK_SIZE;
      let chunks = [];
      if (text.length > chunkSize) {
        setLogs(prev => [...prev, `Text length (${text.length}) > chunk size (${chunkSize}). Splitting...`]);
        for (let i = 0; i < text.length; i += chunkSize) {
          chunks.push(text.slice(i, i + chunkSize));
        }
        setLogs(prev => [...prev, `Text split into ${chunks.length} chunks.`]);
      } else {
        chunks.push(text);
        setLogs(prev => [...prev, `Text length (${text.length}) <= chunk size (${chunkSize}). Processing as 1 chunk.`]);
      }

      for (let i = 0; i < chunks.length; i++) {
        const currentChunk = chunks[i];
        setLogs(prev => [...prev, `--- Processing Chunk ${i + 1} of ${chunks.length} ---`]);
        // Avoid logging potentially large chunks fully
        setLogs(prev => [...prev, `Chunk content (first 50 chars): ${currentChunk.substring(0, 50)}...`]);

        const instructionPrompt = appParams.instructionPromptTemplate.replace('{user_text}', currentChunk);

        try {
          // Await the model invocation for the current chunk
           // Ensure model is not null before invoking (already checked above, but good practice)
           if (!model) throw new Error("Model instance became null unexpectedly.");

          const result = await model.invoke([
              ["system", appParams.systemPrompt],
              ["human", instructionPrompt]
          ]);

          const responseContent = typeof result.content === 'string' ? result.content : '';
          setLogs(prev => [...prev, `Raw Model response (Chunk ${i + 1}): ${responseContent}`]);

          const nodesMatch = responseContent.match(/<nodes>(.*?)<\/nodes>/s);
          const nodesString = nodesMatch ? nodesMatch[1].trim() : '';

          const nodeBlockRegex = /<node>(.*?)<\/node>/gs;
          let match;
          let chunkEdgesCount = 0;

          while ((match = nodeBlockRegex.exec(nodesString)) !== null) {
              const nodeContent = match[1];
              const fromNodeMatch = nodeContent.match(/<from_node>(.*?)<\/from_node>/s);
              const relationshipMatch = nodeContent.match(/<relationship>(.*?)<\/relationship>/s);
              const toNodeMatch = nodeContent.match(/<to_node>(.*?)<\/to_node>/s);

              const source = fromNodeMatch ? fromNodeMatch[1].trim() : null;
              const relationship = relationshipMatch ? relationshipMatch[1].trim() : 'related';
              const target = toNodeMatch ? toNodeMatch[1].trim() : null;

              if (source && target && source !== target) { // Added check to prevent self-loops if desired
                  allExtractedEdges.push({
                      source: source,
                      relationship: relationship,
                      target: target
                  });
                  overallNodeSet.add(source);
                  overallNodeSet.add(target);
                  chunkEdgesCount++;
              } else if (source && target && source === target) {
                 setLogs(prev => [...prev, `Skipping self-loop edge: ${source} --(${relationship})--> ${target}`]);
              } else if (!source || !target) {
                  setLogs(prev => [...prev, `Skipping incomplete edge from chunk ${i+1}: Source='${source}', Target='${target}'`]);
              }
          }
          setLogs(prev => [...prev, `Extracted ${chunkEdgesCount} valid edges from Chunk ${i + 1}. Total edges so far: ${allExtractedEdges.length}`]);

        } catch (chunkError) {
            console.error(`Error processing chunk ${i + 1}:`, chunkError);
            setLogs(prev => [...prev, `Error processing chunk ${i + 1}: ${chunkError.message || chunkError}. Skipping chunk.`]);
             // Decide whether to stop or continue
             // continue; // Uncomment to skip failed chunk and continue
             throw chunkError; // Uncomment to stop processing on first chunk error (default behaviour)
        }
      } // --- End of chunk loop ---

      setLogs(prev => [...prev, '--- Aggregating results ---']);
      setLogs(prev => [...prev, `Total unique nodes found: ${overallNodeSet.size}`]);
      setLogs(prev => [...prev, `Total valid edges found: ${allExtractedEdges.length}`]);


      const finalGraphNodes = Array.from(overallNodeSet).map(nodeId => ({
          id: nodeId,
          label: nodeId
      }));

      const finalGraphEdges = allExtractedEdges.map((edge) => ({
          id: `e-${uuidv4()}`,
          source: edge.source,
          target: edge.target,
          label: edge.relationship
      }));

      setGraphData({ nodes: finalGraphNodes, edges: finalGraphEdges });
      setTableData(allExtractedEdges.map(edge => ({
          node1: edge.source,
          connection: edge.relationship,
          node2: edge.target
      })));

      setLogs(prev => [...prev, 'Graph data processed. Generation complete!']);

    } catch (error) {
        console.error("Error during generation:", error);
        // Avoid duplicating chunk errors already logged
        if (!logs.some(log => log.includes(error.message || error))) {
             setLogs(prev => [...prev, `Error during generation: ${error.message || error}`]);
        }
    } finally {
        setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Node 1', 'Connection', 'Node 2'].join(','),
      ...tableData.map(d => [d.node1, d.connection, d.node2].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, `graph-data-${new Date().toISOString()}.csv`);
  };

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <TextField
        fullWidth
        multiline
        minRows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
        placeholder="Enter your text here..."
        variant="outlined"
        margin="normal"
      />
      
      <Button
        variant="contained"
        onClick={handleGenerate}
        disabled={loading}
        style={{ marginBottom: 20 }}
      >
        Generate Graph
      </Button>

      {loading && <LinearProgress />}

      <ParamsPanel params={appParams} setParams={setAppParams} modelsList={modelsList} />
      
      <div style={{ height: 600, margin: '20px 0', border: '1px solid #ddd' }}>
        <CosmographProvider nodes={graphData.nodes} links={graphData.edges}>
          <Cosmograph
                nodeColor={() => colors[Math.floor(Math.random() * colors.length)]}
                linkWidth={() => 1 + 2 * Math.random()}
                linkColor={() => colors[Math.floor(Math.random() * colors.length)]}
                fitViewOnInit={true}
                backgroundColor={"white"}
                nodeLabelColor={"white"}
                hoveredNodeLabelColor={"#1976d2"}
                simulationFriction={0.1}
                simulationLinkSpring={0.5}
                simulationLinkDistance={2.0}
        />
        </CosmographProvider>
      </div>

      <TableView data={tableData} onExport={exportCSV} />
      <LogsPanel logs={logs} />
    </div>
  );
}