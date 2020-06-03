const path = require('path')
const multer = require('multer')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const bodyParser = require('body-parser')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

require('./db/mongo')
const chat_messages = require('./model/chat')



////////Final models//////////
const users = require('./model/user')
const contact = require('./model/contact')
const community = require('./model/community')

///////////Multer middleware/////////
const upload = multer({

    limits: {
        fileSize: 5000000

    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload an image'))
        }
        cb(undefined, true)
    }
})
const app = express()
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))





io.on('connection', (socket) => {

    console.log('New WebSocket connection')


    socket.on('join', function(data){

        socket.join(data.room)
        console.log("joined room " + data.room)
        socket.broadcast.to(data.room).emit('new user joined', {user:data.username, message:data.username +'has joined this room.'});      })


        socket.on('message',function(data){
            console.log(data);
            io.in(data.room).emit('new message', {user:data.user, message:data.message,time:data.time});
           // socket.broadcast.to(data.room).emit('new user joined', {user:data.user, message:data.message});
          })


    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })
})






//////////////routes//////////////////

//////////one-to-one stuff////////////

app.post('/load_chat', (req, res) => {
    contact.findOne({ _id: req.query._id }).exec(function (err, result) {
        if (err) {
            res.send({ error: "not record of chats found" })
        }
        res.send(result)
    })
})

app.post('/push_message', (req, res) => {
    contact.findOne({ _id: req.query._id }).exec(function (err, result) {
        if (err) {
            res.send({ error: "not record of chats found" })
        }
        result.message.push({
            name: req.query.name,
            text: req.query.text,
            timestamp: req.query.timestamp
        })
        result.save().then(() => {
            res.send(result)
        }).catch(() => {
            res.send({ error: "Error in saving chat! try again" })
        })
    })
})

/////////////////////////////////////

/////avatar testing//////

app.post('/avatar', upload.single('avatar'), (req, res) => {
    res.send()
}, (error, req, res, next) => {
    res.send({ error: error.message })
})

/////////creating user/////////////

app.post('/registeruser', upload.single('avatar'), (req, res) => {

    users.find({ userid: req.body.userid }).exec(function (err, docs) {
        if (docs.length != 0) {
            res.send({ error: "User id already taken! try something unique." })
        }
        else {
            const obj = new users(req.body)
            obj.avatar = req.file.buffer;
            obj.contacts = []
            obj.community = []
            obj.request = []
            obj.save().then(() => {
                if (obj.account_type === "doctor") {
                    const comm = new community({
                        name: obj.name + " community",
                        owner: obj._id,
                        request: [],
                        member: [{
                            chat_id: obj._id,
                            name: obj.name
                        }],
                        message: []
                    })

                    comm.save().then((object) => {
                        const new_obj = {
                            community: object,
                            users: obj
                        }
                        obj.community.push({
                            chat_id: object._id,
                            name: obj.name + " community"
                        })
                        obj.save()
                        res.send(new_obj)
                    }).catch(() => {
                        res.send({ error: "not created" })
                    })
                }
                else {
                    res.send(obj)
                }
            }).catch((e) => {
                res.send({ error: e })
            })
        }
    });

}, (error, req, res, next) => {
    res.send({ error: error.message })
})


app.post('/registeruser/c', (req, res) => {
    users.find({ userid: req.query.userid }).exec(function (err, docs) {

        const obj = docs[0];
        obj.contacts.push({ chat_id: "asdasfsdfd54", name: "abhishek" })

        obj.save().then(() => {
            res.send(obj)
        }).catch((e) => {
            res.send({ error: e })
        })

    });

})



////getting user info 
app.get('/my_info', (req, res) => {
    users.findOne({ userid: req.query.userid }).exec(function (err, docs) {


        if (err) {
            res.send({ error: "no user found" })
        }
        res.send(docs)
    });
})


////updating user profile (editable)
app.get('/edit_my_info', (req, res) => {

})

//////GET request to find contact list of user by his userid (user handel)///////
app.get('./get_contact', (req, res) => {
    users.find({ userid: req.query.userid }).exec(function (err, docs) {
        if (err) {
            res.send({ error: 'unable to find user' })
        }
        else {
            res.send(docs.contacts)
        }
    })
})


//////GET request to find community list of user by his userid (user handel)///////
app.get('/get_contact', (req, res) => {
    users.find({ userid: req.query.userid }).exec(function (err, docs) {
        if (err) {
            res.send({ error: 'unable to find user' })
        }
        else {
            res.send(docs.community)
        }
    })
})


app.get('/get_users', (req, res) => {
    users.find(req.body).exec(function (err, docs) {
        if (err) {
            res.send({ error: 'unable to find user' })
        }
        else {
            res.send(docs)
        }
    })
})

///adding user to the list "conatcts of users"
/// query parameters
/// member_one : name
/// member_two : name
//  member_one_id  :id
//  member_two_id : id
// ABhishek amrute
// ABhishek amrute
// 5ec20bb9230ff738facc7ce6
// 5ec20e93152c15449c0de67a

// localhost:3000/add_contact?member_one=ABhishek amrute&member_two=ABhishek amrute&member_one_id=5ec20bb9230ff738facc7ce6&member_two_id=5ec20e93152c15449c0de67a
app.post('/add_contact', (req, res) => {

    contact.find({
        member_one: req.query.member_one,
        member_two: req.query.member_two,
        member_one_id: req.query.member_one_id,
        member_two_id: req.query.member_two_id,
        
    }).exec(function (error, result) {
        if (error) {
            res.send({ error: "unable to connect to the server! try again." })
        }
        if (result.length == 0) {
            contact.find({
                member_one: req.query.member_two,
                member_two: req.query.member_one,
                member_one_id: req.query.member_two_id,
                member_two_id: req.query.member_one_id,
            }).exec(function (error, result) {
                if (error) {
                    res.send({ error: "unable to connect to the server! try again." })
                }
                if (result.length != 0) {
                    res.send({ error: "The user is already in the contact list" })
                }

                //creating contact object
                const obj = new contact({
                    member_one: req.query.member_one,
                    member_two: req.query.member_two,
                    member_one_id: req.query.member_one_id,
                    member_two_id: req.query.member_two_id,
                    message: {
                        name: "Note",
                        text: "Chat initiated",
                        timestamp: Date.now()
                    }
                })


                //saving contact object to get its _id
                obj.save().then(() => {

                    const chat_id = obj._id
                    //adding chat contact in member one object   
                    users.find({ _id: req.query.member_one_id }).exec(function (err, result) {
                        if (result.length == 0) {
                            res.send({ error: "Some error occured in first step" })
                        }
                        else {
                            const user_one = result[0];
                            user_one.contacts.push({
                                chat_id,
                                userid:req.query.member_two_username,
                                name: req.query.member_two
                               
                            });
                            user_one.save()
                        }


                    })

                    //adding chat contact in member two object   
                    users.find({ _id: req.query.member_two_id }).exec(function (err, result) {
                        if (result.length == 0) {
                            res.send({ error: "Some error occured in secnond step" })
                        }
                        else {
                            const user_one = result[0];
                            user_one.contacts.push({
                                chat_id,
                                userid:req.query.member_one_username,
                                name: req.query.member_one,
                              
                            });
                            user_one.save()
                        }


                    })
                    res.send({ success: "success! in adding user to contact" })
                }).catch((err) => {
                    res.send({ error: err })
                })

            })


        }
        else{
           res.send({ error: "The user is already in the contact list" })
        }
    })



})



///saving contact(one-to-one chat messages)
/// query parameters
// _id : chat_id
// name:req.query.name,
// text:req.query.text,
// timestamp:req.query.timestamp

app.post('/save_contacts_chat', (req, res) => {
    contact.find({ _id: req.query._id }).exec(function (err, result) {
        if (result.length == 0) {
            res.send({ error: "contact not found" })
        } else {
            const obj = result[0]
            obj.message.push({
                name: req.query.name,
                text: req.query.text,
                timestamp: req.query.timestamp
            })

            obj.save().then(() => {
                res.send({ success: "sent" })
            }).catch(() => {
                res.send({ error: "error while storing chat" })
            })
        }

    })
})


///saving community chat messages
/// query parameters
// _id : chat_id
// name:req.query.name,
// text:req.query.text,
// timestamp:req.query.timestamp

app.post('/save_community_chat', (req, res) => {
    community.find({ _id: req.query._id }).exec(function (err, result) {
        if (result.length == 0) {
            res.send({ error: "contact not found" })
        } else {
            const obj = result[0]
            obj.message.push({
                name: req.query.name,
                text: req.query.text,
                timestamp: req.query.timestamp
            })

            obj.save().then(() => {
                res.send({ success: "sent" })
            }).catch(() => {
                res.send({ error: "error while storing chat" })
            })
        }

    })
})



/////////////send community request///////////
////parameters 
///   community_id 
///   user_id
///   user_name
///   community_name

app.post('/send_request', (req, res) => {


    ////sending request to 
    community.findOne({ _id: req.query.community_id }).exec((error, result) => {

        result.request.push({
            chat_id: req.query.user_id,
            name: req.query.user_name,
            status: "pending"
        })
        result.save().then(() => {

            users.findOne({ _id: req.query.user_id }).exec((error, resul) => {

                if (error) {
                    res.send("from in")
                }
                resul.request.push({
                    chat_id: req.query.community_id,
                    name: req.query.community_name,
                    status: "pending"
                })

                resul.save().then(() => {
                    res.send({ success: "Sucsess" })
                }).catch(() => {
                    res.send("errd")
                })
            })


        })

    })



})


////////accepting request//////
// API Parameters
///   community_id 
///   user_id
///   user_name
///   community_name
app.post('/accept_request', (req, res) => {

    community.findOne({ _id: req.query.community_id }).exec((error, result) => {
        if (error) {
            res.send({ error: "Unexpected error occured" })
        }

        result.member.push({
            chat_id: req.query.user_id,
            name: req.query.user_name
        })

        result.request.forEach(element => {
            if (element.chat_id == req.query.user_id) {
                element.status = "accepted"

            }
        });

        result.save().then(() => {

            users.findOne({ _id: req.query.user_id }).exec((error, resu) => {
                if (error) {
                    res.send({ error: "Unexpected error occured" })
                }

                resu.community.push({
                    chat_id: req.query.community_id,
                    name: req.query.community_name
                })

                resu.request.forEach(element => {
                    if (element.chat_id == req.query.community_id) {
                        element.status = "accepted"

                    }
                });

                resu.save().then(() => {
                    res.send({ success: "Success" })
                }).catch(() => {
                    res.send({ error: "Cannot connect to user right now" })
                })

            })

        }).catch(() => {
            res.send({ error: "Cannot connect to the community right now! pls try again" })
        })

    })

})


server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})

// 
// /home/abhishek/mongodb/bin/mongod --dbpath=/home/abhishek/mongodb-data

// https://healthk-chat.herokuapp.com/



{"_id":{"$oid":"5ed5cfdeaecea42a4d46cd5c"},"files_id":{"$oid":"5ed5cfddaecea42a4d46cd5b"},"n":{"$numberInt":"0"},"data":{"$binary":{"base64":"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","subType":"00"}}}