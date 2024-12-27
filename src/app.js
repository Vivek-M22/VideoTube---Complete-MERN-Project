import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express()

// app.use(cors())
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true 
}))

app.use(express.json({limit : "16kb"}))                          //setting the json data limits
app.use(express.urlencoded({extended:true , limit: "16kb"}))    //url encoder cofig like spaces coverted to %20 by the url itself 
app.use(express.static("public"))                              //setting some data to public : like PDF,IMAGES etc
app.use(cookieParser())                                       // use cookieParser for, performing CRUD operation on the server 


export {app}
// export default app