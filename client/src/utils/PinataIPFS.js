import axios from "axios";

export const uploadFileToPinata = async (file, setIsUploading) => {
  const url = `/api/pinata/pinFile`;
  let data = new FormData();
  data.append("file", file);

  data.append("name", file.name);

  setIsUploading(true);

  return axios
    .post(url, data, {
      maxContentLength: "Infinity",
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then(function (response) {
      setIsUploading(false);
      return response.data; // Return the full response data
    })
    .catch(function (error) {
      setIsUploading(false);
      throw error;
    });
};

export const deleteFileFromPinata = async (hash, setIsDeleting) => {
  if (!hash) {
    throw new Error("Missing IPFS hash to delete.");
  }

  const url = `/api/pinata/unpin/${hash}`;

  setIsDeleting(true);

  return axios
    .delete(url, {
      headers: {},
    })
    .then(function (response) {
      console.log("File deleted from Pinata: ", response.data);
      setIsDeleting(false);
    })
    .catch(function (error) {
      console.error("Error deleting file from Pinata: ", error);
      setIsDeleting(false);
      throw error;
    });
};
