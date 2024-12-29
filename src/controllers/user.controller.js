import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser = asyncHandler( async (req , res) => {
    //STEPS TO REGISTER THE USER
    // 1. get user details from frontend
    // 2. validation -- not empty
    // 3. check if user already exist : username , email
    // 4. for new register : check for image and avatar
    // 5. upload them in cloudinary , avatar 
    // 6. create user object - create entry in db
    // 7. remove password and refresh token field from response 
    // 8. check for user creation 
    // 9. return res

    // 1. get user details from frontend
    const {fullName , email , username , password} = req.body
    // console.log("email : " , email);

    // 2. validation -- not empty
    if(
        [fullName , email , username , password ].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400 , "All fields are required")
    }

    // 3. check if user already exist : username , email
    const existedUser = await User.findOne({
        $or : [{ username } , { email } ]
    })

    if(existedUser){
        throw new ApiError(409 , "User with email or username already exists")
    }
    // console.log(req.files);

    // 4. for new register : check for image and avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && 
    req.files.coverImage.length > 0 ){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is required")
    }

    // 5. upload them in cloudinary , avatar 
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400 , "Avatar file is required")
    }

    // 6. create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // 7. remove password and refresh token field from response 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // 8. check for user creation 
    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering the user")
    }

    // 9. return res
    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User registered Successfully")
    )

})


export {
    registerUser,
}



/*
Notes for this page
1. if data is from json , form it can be access through req.body 
but from url it can be access through

2. with help of req.body we can handle data only for file we want to use routes
 use of multer and routes


3. for single field vs multiple field (.some() method)
for single field >>>
if(fullName === "") throw new ApiError(400 , "fullname is requried")

4. req.body // by express
req.files   // multer


*/