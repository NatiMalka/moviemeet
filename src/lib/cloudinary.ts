// Cloudinary configuration and utility functions
export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';

/**
 * Convert a Mega.nz link to a Cloudinary publicId
 * This is a placeholder function - in a real implementation, you would:
 * 1. Download the file from Mega.nz (server-side)
 * 2. Upload to Cloudinary (server-side)
 * 3. Return the Cloudinary publicId
 */
export const megaLinkToCloudinaryId = (megaLink: string): string | null => {
  // This is just a mock function to demonstrate the concept
  // In a real implementation, you would need a server-side function
  
  if (!megaLink) return null;
  
  // Extract a unique identifier from the Mega link
  let identifier = '';
  
  if (megaLink.includes('/file/')) {
    identifier = megaLink.split('/file/')[1].split('#')[0];
  } else if (megaLink.includes('/#!')) {
    identifier = megaLink.split('/#!')[1].split('!')[0];
  } else {
    return null;
  }
  
  // In a real implementation, this would be the Cloudinary publicId after upload
  // For now, we're just returning a mockup
  return `sample_folder/mega_${identifier}`;
};

/**
 * Generate a Cloudinary video URL with optional transformations
 */
export const getCloudinaryVideoUrl = (publicId: string, options: any = {}): string => {
  const {
    quality = 'auto',
    format = 'auto',
    width,
    height,
    crop
  } = options;
  
  let transformations = `q_${quality},f_${format}`;
  
  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height}`;
  if (crop) transformations += `,c_${crop}`;
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${transformations}/${publicId}`;
};

/**
 * Check if a string is a Cloudinary publicId
 */
export const isCloudinaryId = (str: string | undefined | null): boolean => {
  // Return false if the string is null, undefined, or empty
  if (!str) return false;
  
  // This is a simple check - enhance as needed
  return str.includes('/') && !str.includes('://');
};

/**
 * Get video thumbnail from Cloudinary
 */
export const getVideoThumbnail = (publicId: string, options: any = {}): string => {
  const {
    width = 640,
    height = 360,
    quality = 'auto',
    format = 'jpg',
    time = '0'
  } = options;
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/q_${quality},f_${format},w_${width},h_${height},so_${time}/${publicId}`;
}; 