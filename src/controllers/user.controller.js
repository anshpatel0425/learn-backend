import {asyncHandler} from '../utils/asyncHandler.js'
import {apiError}from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from '../utils/apiResponse.js'

const generateAccessAndRefreshTokens = async(userId) => {
    try {
       const user = await User.findOne(userId)

       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {refreshToken, accessToken}

    } catch (error) {
        throw new apiError(500, "something went wrong while generating refresh and access token")
    }
}


const registerUser = asyncHandler( async(req,res) => {
//    get user details from frontend
// validation- details is not empty
// check if user already exists - username, email
// check if image provided, check if avatar provided
// upload image and avatar to cloudinary
// create user object - creation entry in db
// remove password and refresh token from response
// check for user creation
// return response

const {fullName, email, username, password}  = req.body
// console.log("email: ", email)


if([fullName,email,username,password].some((field) => field?.trim()==="")
) {
  throw new apiError(400, "All fields are required")
}

const existedUser = await User.findOne({
    $or: [{ username }, { email }]
})

if(existedUser){
    throw new apiError(409, "user with email or username already exixts")
}

const avatarLocalPath = req.files?.avatar[0]?.path;
// const coverImageLocalPath = req.files?.coverImage?.path;

let coverImageLocalPath;
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path 
}

if(!avatarLocalPath){
    throw new apiError(400, "Avatar is required")
}

const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage = await uploadOnCloudinary(coverImageLocalPath)

if(!avatar){
    throw new apiError(400, "Avatar is required")
}

const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
})

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)

if(!createdUser){
    throw new apiError(500, "something went wrong while registering the user")
}

return res.status(201).json(
    new apiResponse(200, createdUser, "User registered successfully")
)
})

const loginUser = asyncHandler(async(req,res) => {
        // take data from req.body
        // username and email
        // find the user
        // password check
        // generate access and refresh token
        // send cookie

        const {} = req.body

        if(!username || !email){
            throw new apiError(400, "username or email is required")
        }

        const user = await User.findOne({
            $or: [{username}, {email}]
        })

        if(!user){
            throw new apiError(404, "User does not exist")
        }

        const isPasswordValid = await user.isPasswordCorrect(password)

        if(isPasswordValid){
            throw new apiError(401, "Wrong password")
        }

      const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

      const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

      const options = {
        httpOnly: true,
        secure: true
      }

      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new apiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User Logged in Successfully"
        )
      )
})

const logoutUser = asyncHandler(async(req, res) => {
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

     const options = {
        httpOnly: true,
        secure: true
      }

      return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new apiResponse(200, {}, "User Logged Out"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}