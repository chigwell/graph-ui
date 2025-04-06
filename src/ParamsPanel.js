// ParamsPanel.js
import React from 'react';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Box from '@mui/material/Box'; // For better layout
import Typography from '@mui/material/Typography'; // For labels

// Accept params, setParams, and modelsList as props
export const ParamsPanel = ({ params, setParams, modelsList }) => {
  const [open, setOpen] = React.useState(false); // Keep panel open state local

  // Generic handler for most inputs
  const handleValueChange = (field) => (e) => {
    setParams(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  // Specific handler for Slider as it provides value directly
  const handleSliderChange = (field) => (e, newValue) => {
    setParams(prev => ({
      ...prev,
      [field]: newValue
    }));
  };


  return (
    <Box sx={{ margin: '20px 0', border: '1px solid #eee', padding: 2, borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <IconButton size="small" sx={{ mr: 1 }}>
          <ExpandMoreIcon style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        </IconButton>
        <Typography variant="h6">Model Parameters</Typography>
      </Box>

      <Collapse in={open}>
        {/* Use Box for layout and spacing */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mt: 2 }}>

          {/* Model Selection */}
          <Box>
            <InputLabel id="model-select-label">Model</InputLabel>
            <Select
              labelId="model-select-label"
              value={params.modelName} // Use the modelName field
              onChange={handleValueChange('modelName')} // Update modelName field
              fullWidth
            >
              {/* Generate MenuItems from the modelsList prop */}
              {modelsList.map((model) => (
                <MenuItem key={model.name} value={model.name}>
                  {model.displayName || model.name} {/* Use displayName if available */}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Temperature Slider */}
          <Box>
            {/* Using Typography for better label association */}
            <Typography gutterBottom>
              Temperature ({params.temperature})
            </Typography>
            <Slider
              value={params.temperature}
              onChange={handleSliderChange('temperature')} // Use slider-specific handler
              min={0}
              max={1} // Or max=2 depending on model capabilities
              step={0.1}
              valueLabelDisplay="auto"
              aria-labelledby="temperature-slider-label" // For accessibility
            />
          </Box>

          {/* System Prompt */}
           <Box sx={{ gridColumn: '1 / -1' }}> {/* Span across both columns */}
             <TextField
                label="System Prompt"
                multiline
                rows={3} // Adjusted rows
                value={params.systemPrompt}
                onChange={handleValueChange('systemPrompt')}
                fullWidth
                variant="outlined" // Consistent styling
              />
           </Box>

          {/* Instruction Prompt Template */}
          <Box sx={{ gridColumn: '1 / -1' }}> {/* Span across both columns */}
            <TextField
              label="Instruction Prompt Template"
              multiline
              rows={3} // Adjusted rows
              value={params.instructionPromptTemplate} // Use correct field name
              onChange={handleValueChange('instructionPromptTemplate')} // Update correct field name
              fullWidth
              variant="outlined"
              helperText="Use {user_text} as a placeholder for the input text."
            />
          </Box>

          {/* Chunk Size (Optional) - If you implement chunking later */}
          <Box>
            <TextField
              label="Chunk Size (for future use)"
              type="number"
              value={params.chunkSize}
              onChange={handleValueChange('chunkSize')}
              fullWidth
              variant="outlined"
              InputProps={{ inputProps: { min: 128 } }} // Example constraint
            />
          </Box>

        </Box>
      </Collapse>
    </Box>
  );
};