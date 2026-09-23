import {asyncHandler} from '../utils/asyncHandler.js'
import {apiError}from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from '../utils/apiResponse.js'

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
console.log("email: ", email)


if([fullName,email,username,password].some((field) => field?.trim()==="")
) {
  throw new apiError(400, "All fields are required")
}

const existedUser = User.findOne({
    $or: [{ username }, { email }]
})

if(existedUser){
    throw new apiError(409, "user with email or username already exixts")
}

const avatarLocalPath = req.files?.avatar[0]?.path;
const coverImageLocalPath = req.files?.coverImage?.path;

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
export {registerUser}