import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useRef, useState } from 'react'
import { FaCamera } from 'react-icons/fa'
import { storage } from '../firebase'

export default function ProfilePicUpload({ onUpload, currentImage, isUploading, onUploadingStart }) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(currentImage || null)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
    }
    reader.readAsDataURL(file)

    if (onUpload) {
      onUploadingStart && onUploadingStart()
      try {
        const imageRef = ref(storage, `profile-pics/${Date.now()}_${file.name}`)
        await uploadBytes(imageRef, file)
        const url = await getDownloadURL(imageRef)
        onUpload(url)
      } catch (error) {
        console.error('Error uploading image:', error)
        alert('Error uploading image. Please try again.')
      }
    }
  }

  return (
    <div
      className={`profile-pic-upload ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: 'none' }}
        disabled={isUploading}
      />
      {preview ? (
        <div className="profile-pic-preview">
          <img src={preview} alt="Profile preview" className="profile-pic-img" />
          <button className="change-pic-btn" type="button" disabled={isUploading}>
            Change Photo
          </button>
        </div>
      ) : (
        <div className="upload-placeholder">
          <div className="upload-icon">
            <FaCamera />
          </div>
          <p>Drag & drop or click to upload profile picture</p>
          <small>Recommended: 300x300px, JPG/PNG</small>
        </div>
      )}
      {isUploading && <div className="upload-loader">Uploading...</div>}
    </div>
  )
}
