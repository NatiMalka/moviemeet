import React, { useState, useRef } from 'react';
import { CLOUDINARY_CLOUD_NAME } from '../lib/cloudinary';

interface CloudinaryUploaderProps {
  onSuccess: (data: { public_id: string, secure_url: string }) => void;
  onError: (error: string) => void;
}

export function CloudinaryUploader({ onSuccess, onError }: CloudinaryUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      const file = files[0];
      const fileSizeMB = file.size / 1024 / 1024;
      
      // Check file size - free Cloudinary accounts have a 100MB limit
      if (fileSizeMB > 100) {
        onError(`File too large (${fileSizeMB.toFixed(2)}MB). Maximum size is 100MB for free Cloudinary accounts.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log(`Uploading file: ${file.name} (${fileSizeMB.toFixed(2)}MB)`);
      console.log(`Using Cloudinary cloud name: ${CLOUDINARY_CLOUD_NAME}`);
      
      // Create the FormData object for the upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'movie_meet_videos');
      
      // Using XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Make sure we're using the correct cloud name from environment variables
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
      console.log(`Uploading to URL: ${uploadUrl}`);
      
      xhr.open('POST', uploadUrl, true);
      
      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      // Handle the response
      xhr.onload = function() {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          console.log('Upload successful:', response);
          onSuccess({
            public_id: response.public_id,
            secure_url: response.secure_url
          });
        } else {
          console.error('Upload failed:', xhr.status, xhr.statusText);
          try {
            const errorData = JSON.parse(xhr.responseText);
            onError(`Upload failed: ${errorData.error?.message || xhr.statusText}`);
          } catch (e) {
            onError(`Upload failed with status ${xhr.status}: ${xhr.statusText}`);
          }
        }
        setIsUploading(false);
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      
      xhr.onerror = function() {
        console.error('Upload error:', xhr.statusText);
        onError(`Network error during upload. Check your internet connection and try again.`);
        setIsUploading(false);
      };
      
      // Send the upload
      xhr.send(formData);
      
    } catch (error) {
      console.error('Error in upload process:', error);
      onError(`Error preparing upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
    }
  };
  
  return (
    <div className="cloudinary-uploader">
      <div className="mb-2">
        <input
          type="file"
          accept="video/*"
          onChange={handleUpload}
          disabled={isUploading}
          ref={fileInputRef}
          className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {isUploading && (
        <div className="mt-2">
          <div className="bg-gray-700 rounded-full h-2.5 mb-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Uploading...</span>
            <span className="text-xs text-gray-400">{uploadProgress}%</span>
          </div>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-1">
        Upload videos up to 100MB. Larger videos require a paid Cloudinary plan or use Mega.nz instead.
      </p>
    </div>
  );
} 