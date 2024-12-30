import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) => 
{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken , refreshToken }

    } catch (error) {
        throw new ApiError(500 , "Something went wrong while generating refresh and access token")
    }
}


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


const loginUser = asyncHandler( async (req , res) => {
    // STEPS FOR LOGINUSER
    //1. fetch data using req.body 
    //2. check : username or email 
    //3. find the user
    //4. password check
    //5. access and referesh token
    //6. send cookie

    //1. fetch data using req.body 
    const {email , username , password }  = req.body


    //2. check : username or email 
    if(!username && !email ){
        throw new ApiError(400 , "username or email is required")
    }

    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required") 
    //}

    
    //3. find the user
    const user = await User.findOne({
        $or: [{username} , {email}]
    })
    if(!user){
        throw new ApiError(404 , "User does not exist")
    }



    //4. check password
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401 , "Invalid user credentials")
    }
 

    //5. access and referesh token
    const {accessToken , refreshToken } = await 
    generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")



    //6 . send cookies
    const options = {
        httpOnly : true,
        secure: true
    }


   return res
   .status(200)
   .cookie("accessToken" , accessToken , options)
   .cookie("refreshToken" , refreshToken , options)
   .json(
        new ApiResponse(
            200,
            { user: loggedInUser, accessToken,refreshToken },
            // it is the case where user want to save the info because for the reason of localstorage , mobile applicn developmenet 
            "User logged In Successfully"
        )
   )
})


const logoutUser = asyncHandler( async(req, res) => {
    // cookies removes
    // refreshtoken token reset

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : { refreshToken: undefined }
        },
        { new : true }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(new ApiResponse(200 , {} , "User logged Out"))

})


const refreshAccessToken = asyncHandler( async(req , res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(incomingRefreshToken){
        throw new ApiError( 401 , "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401 , "Invalid refresh token")
        }

        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "Refresh token is expired or used")
        }

        const options ={
            httpOnly: true,
            secure: true
        }

        const {accessToken , newRefreshToken } = await 
        generateAccessAndRefreshTokens(user._id)

        return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refershToken" , newRefreshToken , options )
        .json(
            new ApiResponse(
                200 , 
                { accessToken , refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
       throw new ApiError(401 , error?.message || "Invalid refresh token") 
    }
})
 
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
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

5. for only username want 
User.findOne({username })
User.findOne({email})
for both 
User.findOne({
    $or: [ { email } , { username }]
})

6. User vs user ( DIY again )
User => we made this for user in moongoseDB and with this we can'nt use function which is created by us . we can use findOne etc
user => normal function in block of program which can access the isPasswordCorrect and generateAccessToken etc

7. generateAccessAndRefreshTokens
const generateAccessAndRefreshTokens = async(userId) => {}
here asyncHandler is not required because it is internal method not for web

8. await
chize agr time se na toh async-await use kro

9. cookies
    const options = { httpOnly : true, secure: true }
    --- with help this cookie can modified by server only . Otherwise in default it can be modified by both frontend and server side

10. logout without form (does'nt having access of user )
-- by custom middlewares



*/