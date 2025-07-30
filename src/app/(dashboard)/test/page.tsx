'use client'
import { useState } from 'react'
import { Grid, Box, Typography, IconButton, TextField, Button } from '@mui/material'

const FileUploadWithEdit = () => {
  const [uploadedFiles, setUploadedFiles] = useState([
    { name: 'file1.mp4', type: 'video/mp4', size: 1024 * 1024 } // example file
  ])

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newFileName, setNewFileName] = useState<string>('')

  // Handle name change in the input field
  const handleFileNameChange = (index: number, newName: string) => {
    setUploadedFiles(prev => {
      const updatedFiles = [...prev]
      updatedFiles[index].name = newName
      return updatedFiles
    })
  }

  // Handle start of editing
  const handleEditClick = (index: number) => {
    setEditingIndex(index) // Set which file to edit
    setNewFileName(uploadedFiles[index].name) // Pre-fill the input field with the current name
  }

  // Handle saving the new name
  const handleSave = () => {
    if (editingIndex !== null) {
      handleFileNameChange(editingIndex, newFileName)
      setEditingIndex(null) // Close the editor
    }
  }

  // Handle cancel editing
  const handleCancel = () => {
    setEditingIndex(null) // Close the editor without saving
  }

  return (
    <>
      <Grid container spacing={2}>
        {uploadedFiles.map((file, index) => (
          <Grid item xs={12} key={index}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant='body1' sx={{ fontWeight: 600 }}>
                {file.name}
              </Typography>
              {/* Button to start editing */}
              <IconButton onClick={() => handleEditClick(index)}>
                <i className='bx bx-edit' />
              </IconButton>

              {/* If editing, show the text field */}
              {editingIndex === index ? (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    value={newFileName}
                    onChange={e => setNewFileName(e.target.value)}
                    variant='outlined'
                    size='small'
                    sx={{ maxWidth: '200px' }}
                  />
                  <Button variant='contained' color='primary' onClick={handleSave}>
                    OK
                  </Button>
                  <IconButton onClick={handleCancel} color='error'>
                    <i className='bx bx-x' />
                  </IconButton>
                </Box>
              ) : null}
            </Box>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        {uploadedFiles.map((file, index) => (
          <Grid item xs={12} key={index}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant='body1' sx={{ fontWeight: 600 }}>
                {file.name}
              </Typography>
              {/* Button to start editing */}
              <IconButton onClick={() => handleEditClick(index)}>
                <i className='bx bx-edit' />
              </IconButton>

              {/* If editing, show the text field */}
              {editingIndex === index ? (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    value={newFileName}
                    onChange={e => setNewFileName(e.target.value)}
                    variant='outlined'
                    size='small'
                    sx={{ maxWidth: '200px' }}
                  />
                  <Button variant='contained' color='primary' onClick={handleSave}>
                    OK
                  </Button>
                  <IconButton onClick={handleCancel} color='error'>
                    <i className='bx bx-x' />
                  </IconButton>
                </Box>
              ) : null}
            </Box>
          </Grid>
        ))}
      </Grid>
    </>
  )
}

export default FileUploadWithEdit
