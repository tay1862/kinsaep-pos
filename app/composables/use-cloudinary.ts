/**
 * Cloudinary image upload composable
 * Supports user-configured or system default API keys
 */

interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey?: string;
  folder?: string;
}

interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  duration?: number; // For videos
  format?: string;
  resourceType?: "image" | "video" | "raw";
}

// Settings storage key
const CLOUDINARY_SETTINGS_KEY = "bitspace_cloudinary_config";

export function useCloudinary() {
  const config = useRuntimeConfig();
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const error = ref<string | null>(null);

  /**
   * Get Cloudinary configuration
   * Priority: User settings → System default (env)
   */
  function getConfig(): CloudinaryConfig | null {
    // Try user settings first
    if (import.meta.client) {
      const saved = localStorage.getItem(CLOUDINARY_SETTINGS_KEY);
      if (saved) {
        const userConfig = JSON.parse(saved) as CloudinaryConfig;
        if (userConfig.cloudName && userConfig.uploadPreset) {
          return userConfig;
        }
      }
    }

    // Fall back to system default from env
    const systemCloudName = config.public?.cloudinaryCloudName as
      | string
      | undefined;
    const systemPreset = config.public?.cloudinaryUploadPreset as
      | string
      | undefined;

    if (systemCloudName && systemPreset) {
      return {
        cloudName: systemCloudName,
        uploadPreset: systemPreset,
        apiKey: config.public?.cloudinaryApiKey as string | undefined,
      };
    }

    return null;
  }

  /**
   * Save user Cloudinary configuration
   */
  function saveConfig(newConfig: CloudinaryConfig): void {
    if (import.meta.client) {
      localStorage.setItem(CLOUDINARY_SETTINGS_KEY, JSON.stringify(newConfig));
    }
  }

  /**
   * Clear user configuration (use system default)
   */
  function clearConfig(): void {
    if (import.meta.client) {
      localStorage.removeItem(CLOUDINARY_SETTINGS_KEY);
    }
  }

  /**
   * Check if Cloudinary is configured
   */
  function isConfigured(): boolean {
    return getConfig() !== null;
  }

  /**
   * Upload image to Cloudinary
   */
  async function uploadImage(
    file: File,
    options?: { folder?: string }
  ): Promise<UploadResult | null> {
    return uploadFile(file, "image", options);
  }

  /**
   * Upload video to Cloudinary
   */
  async function uploadVideo(
    file: File,
    options?: { folder?: string }
  ): Promise<UploadResult | null> {
    return uploadFile(file, "video", options);
  }

  /**
   * Generic file upload to Cloudinary
   */
  async function uploadFile(
    file: File,
    resourceType: "image" | "video" | "auto" = "auto",
    options?: { folder?: string }
  ): Promise<UploadResult | null> {
    const cloudConfig = getConfig();

    if (!cloudConfig) {
      error.value = "Cloudinary not configured. Please add API settings.";
      return null;
    }

    isUploading.value = true;
    uploadProgress.value = 0;
    error.value = null;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", cloudConfig.uploadPreset);

      // Add folder if specified (priority: options → config)
      const folder = options?.folder || cloudConfig.folder || "bnos.space";
      if (folder) {
        formData.append("folder", folder);
      }

      // Use auto resource type to support both images and videos
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudConfig.cloudName}/${resourceType}/upload`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Get detailed error from Cloudinary
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        throw new Error(`Upload failed: ${errorMsg}`);
      }

      const data = await response.json();

      return {
        url: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height,
        duration: data.duration,
        format: data.format,
        resourceType: data.resource_type,
      };
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Upload failed";
      console.error("[Cloudinary] Upload error:", e);
      return null;
    } finally {
      isUploading.value = false;
      uploadProgress.value = 100;
    }
  }

  /**
   * Upload from data URL (base64)
   */
  async function uploadDataUrl(
    dataUrl: string,
    options?: { folder?: string; resourceType?: "image" | "video" | "auto" }
  ): Promise<UploadResult | null> {
    const cloudConfig = getConfig();

    if (!cloudConfig) {
      error.value = "Cloudinary not configured";
      return null;
    }

    isUploading.value = true;
    error.value = null;

    try {
      const formData = new FormData();
      formData.append("file", dataUrl);
      formData.append("upload_preset", cloudConfig.uploadPreset);

      // Add folder if specified
      const folder = options?.folder || cloudConfig.folder;
      if (folder) {
        formData.append("folder", folder);
      }

      const resourceType = options?.resourceType || "auto";
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudConfig.cloudName}/${resourceType}/upload`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Get detailed error from Cloudinary
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        throw new Error(`Upload failed: ${errorMsg}`);
      }

      const data = await response.json();

      return {
        url: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height,
        duration: data.duration,
        format: data.format,
        resourceType: data.resource_type,
      };
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Upload failed";
      return null;
    } finally {
      isUploading.value = false;
    }
  }

  return {
    // State
    isUploading,
    uploadProgress,
    error,

    // Config
    getConfig,
    saveConfig,
    clearConfig,
    isConfigured,

    // Upload
    uploadImage,
    uploadVideo,
    uploadFile,
    uploadDataUrl,
  };
}
