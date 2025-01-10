import {v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //upload the file on cloudinary

        const response = await cloudinary.uploader.upload(localFilePath , {
            resource_type: "auto"
        })

        //file has been uploaded successfull
        // console.log("file is uploaded on cloudinary " , response.url);
        fs.unlinkSync(localFilePath)
        return response;
    }
    catch (error){
        fs.unlinkSync(localFilePath)  // remove the locally saved file as the upload operation got failed
        return null;
    }
}


export {uploadOnCloudinary}



/*
This file provides a utility function to upload files to Cloudinary and handles both successful uploads and errors by cleaning up local files.

1. Importing Cloudinary:
   - `import {v2 as cloudinary } from "cloudinary"`
     This line imports the `v2` version of the `cloudinary` library and renames it to `cloudinary` for use in this file. Cloudinary is a service that provides cloud-based image and video management.

2. Importing File System:
   - `import fs from "fs"`
     This line imports the `fs` (File System) module from Node.js, which allows you to interact with the file system, such as reading and writing files.

3. Configuring Cloudinary:
   - `cloudinary.config({ ... })`
     This block configures the `cloudinary` instance with credentials. It uses environment variables (`process.env`) to securely store sensitive information like `cloud_name`, `api_key`, and `api_secret`.

4. Defining the Upload Function:
   - `const uploadOnCloudinary = async (localFilePath) => { ... }`
     This line defines an asynchronous function named `uploadOnCloudinary` that takes a `localFilePath` as an argument. This function will handle uploading a file to Cloudinary.

5. Handling File Upload:
   - `try { if(!localFilePath) return null }`
     The function starts with a `try` block to handle potential errors. It first checks if `localFilePath` is provided; if not, it returns `null`.

6. Uploading to Cloudinary:
   - `const response = await cloudinary.uploader.upload(localFilePath , { resource_type: "auto" })`
     This line uploads the file located at `localFilePath` to Cloudinary. The `resource_type: "auto"` option allows Cloudinary to automatically detect the type of file (image, video, etc.).

7. Deleting Local File:
   - `fs.unlinkSync(localFilePath)`
     After a successful upload, this line deletes the local file using `fs.unlinkSync`, which synchronously removes the file from the file system.

8. Returning the Response:
   - `return response;`
     The function returns the response from Cloudinary, which typically includes details about the uploaded file, such as its URL.

9. Handling Errors:
   - `catch (error){ fs.unlinkSync(localFilePath); return null; }`
     If an error occurs during the upload, the `catch` block executes. It attempts to delete the local file (if it exists) and returns `null` to indicate the upload failed.

10. Exporting the Function:
    - `export {uploadOnCloudinary}`
      This line exports the `uploadOnCloudinary` function so it can be imported and used in other parts of the application.


Overall, this file provides a utility function to upload files to Cloudinary 
and handles both successful uploads and errors by cleaning up local files.

*/