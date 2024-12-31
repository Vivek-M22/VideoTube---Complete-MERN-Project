import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

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
            // $set : { refreshToken: undefined }
          $unset: { refreshToken : 1 }             //this removes the field from document
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

    if(!incomingRefreshToken){
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


const changeCurrentPassword = asyncHandler( async(req, res) => {

    const {oldPassword , newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400 , "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(new ApiResponse(200 , {} , "Password changed successfully"))

})



const getCurrentUser = asyncHandler( async( req , res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200 ,
        req.user ,
        "current user fetched successfully"
    ))
})



const updateAccountDetails = asyncHandler( async(req , res) => {

    const {fullName , email} = req.body

    if(!fullName || !email ){
        throw new ApiError(400 , "All field are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new : true}

    ).select("-password")


    return res
    .status(200)
    .json(new ApiResponse(200 , user , "Account details updated Successfully "))
})


// file updation : in routes two middlewares ko call krna padega
const updateUserAvatar = asyncHandler(async(req, res) => {

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    //TODO : delete old image - Assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400 , "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        { new : true}
    ). select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Avatar Image updated successfully ")
    )
 
})

const updateUserCoverImage = asyncHandler(async(req, res) => {

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400 , "Cover Image file is missing")
    }

    //TODO : delete old image - assignment
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400 , "Error while uploading on Cover Image")
    }

    const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        { new : true}
    ). select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Cover Image updated successfully ")
    )
 
})


const getUserChannelProfile = asyncHandler( async( req , res) => {

    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400 , "username is missing")
    } 

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                // from : Subscription -> Subscriptions(mongodb conversion)
                from : "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from : "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if : {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404 , "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0] , "User channel fetched successfully")
    )
})



const getWatchHistory = asyncHandler( async(req , res) => {

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from : "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline : [
                    {
                        $lookup: {
                            from : "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200 ,
            user[0].watchHistory,
            "watch history fetched successfully"
        )
    )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
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


11. ACCESS_TOKEN VS REFRESH_TOKEN
Access Token:
Purpose: Used to access protected resources (APIs, user data).
Lifespan: Short-lived (minutes to hours).
Security: Should be kept secure; usually stored in memory or HTTP-only cookies.
Usage: Sent with each request to the server to authenticate the user.

Refresh Token:
Purpose: Used to obtain a new access token when the current one expires.
Lifespan: Long-lived (days to months).
Security: Must be kept very secure; often stored in HTTP-only cookies.
Usage: Sent to the server to get a new access token without re-authenticating the user.
Summary:

Access Tokens are for accessing resources quickly and securely.
Refresh Tokens are for getting new access tokens without re-login.


12. mongoose operators (DIY)
$set , 


13. Subscription Schema

doc contains : subscribers , channels
SUBSCRIBER -> a, b, c, d, e
channel -> cac , hcc , fcc 

1stDoc (chan -> cac ,sub -> a)
2ndDoc (chan -> cac ,sub -> b)
3rdDoc (chan -> cac ,sub -> c)
4thDoc (chan -> hcc ,sub -> c)
5thDoc (chan -> fcc ,sub -> c)

for counting no. of subscriber for channel cac then COUNT THE NO. OF DOCS OF CHANNEL HAVING CAC
for couting no. of channel for particular subscriber(c ) => COUNT THE NO. OF DOCS  OF HAVING SUBS C







*/