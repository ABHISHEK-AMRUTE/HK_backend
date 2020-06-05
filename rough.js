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

{"_id":{"$oid":"5ec78bd0199fec20a877d52d"},"phone":{"$numberDouble":"9424478900"},"description":"Available","userid":"hello123","name":"Abhishek Amrute","email":"abhi@gmail.com","createdAt":{"$numberDouble":"1590135660341"},"account_type":"patient","contacts":[{"_id":{"$oid":"5ed0da1de61a512ef39a7e5b"},"chat_id":{"$oid":"5ed0da1de61a512ef39a7e59"},"userid":"maha@123","name":"Nilesh Mahajan"},{"_id":{"$oid":"5ed0da6f71863a303ac32936"},"chat_id":{"$oid":"5ed0da6e71863a303ac32934"},"userid":"Kunal@123","name":"Nilesh Mahajan"}],"community":[],"request":[],"avatar":{"$binary":{"base64":"iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAACAASURBVHic7N15mFxVgTbw95y71NZb9gQCgawEQtHIKqBBJCCKAZGtQFEQGXeEEkXFzxm3URGHmdEROogiagCXoQOjAgKyCqLShEBCdxKykXRIOr13Vd31+6OaACHptarOvXXf32M/dNLdVa9Jus9b555zrvB9H0QULgeedpEw48nZQoi3wcdhPvzZvudN8X1/Iny/zocfBxCD7xsADB/Q4fs64Gu+Dwn4wvd9AQBCCF8I4QHCFUK4EMIWEBYECoDIC4E8IAYADAgh+gD0CiFehhDPCoinWpubNqv8syCisREsAETBlM5kGwAc9NqbYxeOsm3rCNexZrmOXfvaAK6aEMKXUssLKbuEkNuFEBuEEGsgRMtgQdioOiMRvRULAJFi6Uw2CeBtAI4ZfDsUxUG/fqivc10HnuvAdezX33edsucdLSGEL6SWl1K+KqXWIoS8XwhxV2tz007V2YiijAWAqILSmawOYBGAY1Ec7I8FcBgArTTP4MN13WIpcGw4jgXXsUvz0CUmNT2vSW2jkPIZIeW9AqK5tbkprzoXUVSwABCVUTqTnYc3D/aNABKVzOD7frEI2BYc24Lj2kAAv++FEJBS75Watk4I+Vch5f+2NTc9oDoXUbViASAqoXQmWwvgVABnDL7NVJtoL3wfzmuzA7YFx7EQ1J8DUkpX04w2oWnNUsj/bG1u2qY6E1G1YAEgGqd0JnsYgPeiOOCfBMBQm2j0HMeGbeVhW3l4AVxH8BpNNzo1TX9SSLmsrXlZs+o8RGHGAkA0SulMtgbAu/H6oH+A2kSl5brO7jIQ1PUDACCl5mqa3io17W5RnB3YrjoTUZiwABCNQDqTnQwgA+AsAO8AYKpNVBme58K2CrCtPBy7oDrOEAQ0Xd+lafpDUmpfbW1ualWdiCjoWACI9iGdycYAnAngEhRf6Yduar+UfN8bLAM52FaQywCg62a71PVfSiG/2drc1KM6D1EQsQAQ7SGdyb4dxUH/AgATFMcJJM/zYBUGYBVygV4zIIT0dcNYLaV+Y9uKZctU5yEKEhYAIgDpTPZgAB9CceCfqzhOqDi2BaswANvKB3Y3AQBIqdmabjwmNf3f2pqbHlWdh0g1FgCKrHQmm0Lxuv4lKK7eD8TRumHl+z7sQg5WYQBOgBcPAoCmG92apjdLqV3T2tz0quo8RCqwAFDkpDPZ/QB8FsC/gFP8ZeG6Dqz8AKzCQKBnBYqXCMynNU3/VGtz07Oq8xBVEgsARUY6kz0CwNUovuqP9IK+SvF9H4V8P6x8PzzPUx1nSLoRW6fp+pfbmpf9RnUWokpgAaCqls5kBYD3AMiiuHefVPB9WFYO+Vx/oBcNAoCmG7t03bhRCPnt1uamYLcWonFgAaCqNLiF70MArkLxZjsUELaVRyHXD8exVEcZktT0gq4bd0ipfY5bCakasQBQVUlnsg0oXt//NIBpiuPQEBzHQiHXD9sK9g0AhZSerpt/0TT9stbmpo2q8xCVCgsAVYV0JhsH8DkA14IL+0LFdR3kB3qDXwSE9A0z9kcptYtbm5u6VOchGi8WAAq1dCarAfgogH8DsL/aNDQejmMh398b/EsDUrq6EfullNoVrc1NwQ5LNAQWAAqtdCb7AQDfBrBQdRYqHdvKIz/QCzfgiwWlphV0I3bj2hW3XKs6C9FYsABQ6KQz2XcC+B6A41VnofKxCgPID/TB81zVUYakaUafbphfaVux7L9VZyEaDRYACo10JpsG8O8o3oaXIsD3fVj5AeRzffD9YO/I03Vzh2YYn2prXvZb1VmIRoIFgAIvnclOAvB9FK/1S7VpSAXf95Af6EUhP6A6yrB0I9aq68aZrc1NbaqzEA2FBYACLZ3JXgLgBgCTVWch9RzHRq6/G27A7zUghPQMM37L2ntu+RfVWYj2hQWAAimdyc4DcBOAU1RnoeAp5PqRz/UG+j4DAKDpRqduxC5oa256QHUWoj2xAFCgpDNZE8CXAHwVQExxHAowz3OR6+8J/PkBEAKGEXtI0/SzWpub+lTHIXoNCwAFRjqTfQeAm8FtfTQKtpVHrr8n8LsFpKYVDCOebVux7MeqsxABLAAUAOlMdiKKi/wuAyAUx6EQ8n1/cJFgv+oowxpcJPje1uamdaqzULSxAJBS6Uz2TAA/BTBVdRYKP8cuYKCvK/C3HhZSeqYZ/1bbilu+rjoLRRcLACkxeLe+7wG4UnUWqi6+72Ggrzv4awMAGGa8RdP0xbzbIKnAAkAVl85k5wO4A8CRqrNQ9bLyA8gN9AR/p4Cm53QzdnZb87L7VWehaOGhKlRR6Uz2owD+CQ7+VGZmPIna+snQdEN1lCG5rpOw8gP3zX3/5beozkLRwhkAqoh0JlsH4CcALlKdhaInN9CLQi74O/B0I7ZB142TWpubXlGdhaofCwCVXTqTPQbFKf/ZqrNQdDl2Af29XYG/p4CUmm2Y8Y+3rVh2m+osVN1YAKis0pns1QC+CyDY87AUCZ7ror93V+BvNQwAZiyxYu09Pz1LdQ6qXiwAVBbpTNZA8Sjfy1RnIXoj3/cx0NcVil0Cg2cGHNna3BT8uyBR6LAAUMkNHuzzOwAnK45CtE/5XB/yA72qYwxL040uw4gdzYODqNRYAKikBm/i838A5qnOQjQc28pjoK8r8FsFpdRsI5Z4H28qRKXEbYBUMulM9mQAT4GDP4WEYcZRUz8ZUtNVRxmS57mGlR+4b97Sj39edRaqHpwBoJJIZ7KXoXjNn4v9KHR830Nfzy64jq06yrDMWPJna++5hWtraNxYAGhc0pmsQHGV/xdVZyEaD9/30d+7C45tqY4yLMOMP61p+gmtzU3B3tNIgcYCQGOWzmQ1AL8AD/ehKlHcIdAJ2yqojjKswUODFrQ2NwW/sVAgsQDQmAwO/r8EcKHqLESlNtDXBauQUx1jWLphbtJ1cx5LAI0FCwCNWjqT1QH8CsD5qrMQlUuuvxuFfPC33+uGuVnXzfmtzU3BP9iAAoUFgEZlcPBfDuBc1VmIyi089xAwtwzOBLAE0IhxGyCN2ODpfneCgz9FRCJZi1gipTrGsBzbmuk41rr5Z12RVJ2FwoMFgEZkcPC/C8A5qrMQVVIiWQczFvxx1bGt/RzHWssSQCPFAkDDGhz8fwvgbNVZiFRI1tTDMOOqYwzLsa0Zjs2ZABoZFgAaif8BsFR1CCKVkjUN0A1TdYxhOY413XXsf6rOQcHHAkBDSmeyXwBwueocRKoJIZCqnQhND/5hl7ZdWDD3/R+7R3UOCjYWANqndCa7FMD3VOcgCgohBGpqJ0Jqmuoow7IKuTPnLb38W6pzUHBxGyDtVTqTbQTwOIDgL4EmqjDPddDbvTPwdxEUQsCMJy9sa152p+osFDwsAPQW6Ux2BoC/AZipOgtRUNlWHv29napjDEtK6Zqx5NGtzU0tqrNQsPASAL1JOpNNArgHHPyJhmSY8VCcEeB5nmZb+Sfmn3XFZNVZKFhYAGhPtwI4SnUIojBIJOtCsTPAdZ2k41j/UJ2DgoWXAGi3dCb7IQC3q85BI1f8/vVR/Db2Ad+HD3/w3T0+9hohICBQ/J8Y/HXx9wFR/A8ERPEdGobneejr3gHPC/6dec1Y8qa199zySdU5KBhYAAgAkM5k9wewCkCD6ixR5PsefM+D5/vwPe8Nv/b2+etKEUJACFl8k4PvSwm5+/dk8XNk8ddy8PeixHEs9HV3qI4xLCGEH4unjmltbuJsAEFXHYAC46fg4F9GPlzXhee68DwHnusUf+058FxXdbgh+b4P33cBuMAoogohITUNUmqD/9Vf/7XUqmqGQddNxBM1yAf8xkG+7wvbLvwJwBTVWUg9zgAQ0pnsJwD8RHWOsPN9H57nwnOd3QN9cdB34HnBHuRVeK0IvF4S9Df9OnR8Hz3dO+G5juokwzJjieVr7/npRapzkFosABGXzmRnA1gJ7vcfkeIgPzjAuw7cNw34HORLR+wuAtqesweaBiGCeYnBsS309YTiUgDMeOrktuamR1RnIXVYACIsnclKAI8AOEl1lqDxfR+ua8N1bLiO8/qgz0E+EPa8vKBJHZpuQGq68ksLA33dsAoDSjOMhKYbPYYRm9Ta3BT8KQsqC64BiLaPgIM/AOwe7B3ntUHfVh2JhuD7HlzHg4u3/j1pWrEMaJoBTS++X8kZg0SqFradhx/wXQGuY9dpmnEzgI+pzkJqcAYgotKZrAmgFcAs1VkqzXNdOI61e6B3XTvwR7rS+EipDZaCwXKgG2VdZ2AVchjo6yrb45eKlJpjxhITWpubgr16kcqCMwDRdTkiMPj7nrd7sH/t1X0lt9BRMHieC89683yBELI4Q6AZg6Wg+H4pmLEECvn+wM8keZ6re557C4ALVWehyuMMQASlM9kEgLUA9lOdpZR83x98VW/tHux5zZ5GRYjiLMEbLh9omjGmdQW2lUN/b/BnAYSUbiyWnNra3LRLdRaqLM4ARNOnUCWDv+NYcGwLjl2A49gACy2Nx+4SaQOF139b0w3ougndMKDp5oguHxhmAlLrDf45D56neZ77cwBLVWehyuIMQMSkM9kaAC8DCOWNQYpT+YMDvm3x2j0pIaUG3TCh6yY0w4Sm7f21lJUfwEB/d4XTjZ4Q0ovFk/u1NjdtV52FKoczANHzSYRo8PdcB45twd494PP6PanneS6sQg5WIQeguJ5AN4zdhUDXDEAImLEE8rnewN8nwPc96XnuTwGcqToLVQ4LQPQE+vQvz/MGX90XB3xew6cw8H0PtlWAbQ1eNxACumYUZwmM2O6iEGSOY5+iOgNVFi8BREg6k52H4ta/wHEdG/lcH2wrrzoKUWTFEjWntTU3PaA6B1VGMM/TpHI5T3WAPTl2AX09Hejt3snBn0gxz3OvUZ2BKoeXAKIlMAXA933093bCsQvDfzIRVYTr2DwZNEI4AxARg9P/japzAMXrpf09HRz8iQLGc53EvLOuWKI6B1UGC0B0nK06AFAc/Pt6dhX37BNR4Piee6XqDFQZvAQQHYeoDuD7Hvq6O+CG4H7pRFHled481RmoMjgDEB0Hqg6QH+jj4E8UcL7vheacEBofFoDoUHrjH89zUcgH/x7pRFHne16t6gxUGSwAEZDOZAUUzwDkB3oB8MwJoqDzfM+Yf9YVHBsigH/J0TANQEzVk7uOHYqT0IgIr91Qa5HqGFR+LADRoHRKj1P/ROHiF180UJVjAYiGzVA4/+663PJHFCYCeEZ1Bio/FoAIWLn8hjyAbaqe3+PKf6LQEFK6rc1NXapzUPmxAETHyyqe1PNc8IZTROEhpdavOgNVBgtAdKgpAHz1TxQqQsgO1RmoMlgAomONiid1XVfF0xLRGAkh16nOQJXBAhAdy6FkISCn/4nCRGrat1RnoMpgAYiIlctvWA/gQdU5iCi4NN3Y1dbc9IjqHFQZLADR0qQ6ABEFl6Ybt6nOQJXDAhAtzQB2qA5BRMEjhPSkkP9PdQ6qHBaACFm5/AYLwE9V5yCi4NEN82+tzU19qnNQ5bAARM+3oWhLIBEFk5Sao2n62apzUGWxAETMyuU39AG4DFyeT0SDDDN+TWtz03bVOaiyWAAiaOXyG/4C4L9V5yAi9Qwz/lzbimU3qs5BlccCEF1fBtCmOgQRqSOlZmuafqrqHKQGC0BErVx+wwCAjwAoqM5CRAoIAcOMf7q1uWmn6iikBgtAhK1cfsNfAZwLgPfrJYqYWCzxjbYVy5apzkHqsABE3MrlN9wL4AIAvGsPUUSY8eT32lbc8nXVOUgtFgDCyuU3/C+ADwHgnXuIqpwZT/7n2hW3XKs6B6nHAkAAgJXLb7gTwKUAPNVZiKg8zFjy5rUrbvm86hwUDCwAtNvK5TfcDuBCADwNjKiKCCF8M578j7X33PIJ1VkoOFgA6E1WLr/hNwCOBbBadRYiGj+paQUznnz/2hW3XK06CwULCwC9xcrlN6xGsQTcqToLEY2dbpibTDMxq6152f+pzkLBI3yfJ8LSvqUz2c8B+AEAYyxfX8j3I9ffU9pQRDQsM5b4/dp7fvpB1TkouDgDQENaufyG/wJwMoD1Y/l6UdI0RNEx1u8dKTU7Fk99goM/DYcFgIa1cvkNTwI4DMA3MMqTAycInjFENBaTtFHuyi2e7PeoGUtMbVux7ObypKJqwksANCrpTHYegB8BOG0knz/beRX/7ObxAkSjtShuYVXeHNHnarrRoRuxTFtz0wNljkVVhAWAxiSdyZ4H4D8A7D/U5x3ubsNjXZXJRFRNjk/m8dRAfMjPkVK6uhn/L67wp7HgJQAak8HtggsB3AAgrzgOUbQUp/v/bsaSB3Dwp7HiDACNWzqTnQHgGgD/AiD5xo9xBoBobPY2AyCEgG7E/qlp+sdam5taFEWjKsECQCWTzmSnAMgC+BSAWoAFgGis3lgAhBC+bsSe1jT90tbmpjWKo1GVYAGgkktnshMBfB7AZw93tzWwABCN3vHJPJ7OJXzdiD0+OPCvU52JqgsLAJVNOpOtP87d/MTD3dphqrMQhc0JNfb2p5yJx7Q2N21WnYWqk646AFWvlctv6P7uZRc/97Q2nQWAaJQOTbQ/+ItbOfhT+XAXAJXVwVquQ3UGojDi9w6VGwsAldWhRj9/iBGNAb93qNxYAKisDtP7ekzhqY5BFCqm8HCY3se7aFFZsQBQWUnAP9rgzzGi0Tja6IEEuEKbyooFgMru3PirqiMQhQq/Z6gSWACo7E6OdWKS5F0BiUZikrRxcqxTdQyKABYAKjsdPs6O71AdgygUzo7vgM7Zf6oAFgCqiI8ktnIWgGgYk6SNjyS2qo5BEcECQBXRIB18vXa96hhEgfb12vVokI7qGBQRLABUMSebnVjKSwFEe7U0vgMnm7z2T5XDAkAVdW3NBsyQBdUxiAJlhizg2poNqmNQxLAAUEXVCBc3N6zhegCiQZOkjZsb1qBGuKqjUMSwAFDFHaTl0FS/GvWC1zop2uqFg6b61ThIy6mOQhHEAkBKzNMHcFPDar7qociqES5ualiNefqA6igUUSwApMxhej9+Ur8GE3k5gCJmorTxk/o1OEzvVx2FIowFgJQ6wujFnROexyK9T3UUoopYpPfhzgnP4wijV3UUijgWAFJumrTw84YXeVogVb2z4zvw84YXMU1aqqMQQVcdgAgo3v70G7XrcKjeh+v7DoINoToSUckY8HFNzQZcmNiuOgrRbpwBoEC5MLEdd01ciSM5PUpV4kijF3dNXMnBnwKHMwAUOHO0HH7e8AJ+m5+G/+g7EH2+pjoS0ajVCBdX1WzCufHtnM+iQOIMAAWSAHBefDuaJ7ZgSWyX6jhEo7IktgvNE1twHgd/CjDOAFCgTZE2bqhrxdNWPX40MBPP2bWqIxHt0xFGLz6T3ILjzG7VUYiGxQJAoXCc2Y3jzG48YTXgx/0zscqpUR2JaLdFeh8+ndqCE80u1VGIRowFgELlRLMLJ5pdeMSagP/pn4nVTkp1JIqwhXo/PpXagsW8ix+FEAsAhdJisxOLzU48bjVgeW46Hrca4KsORZEgAJxkdiGTaMdJfMVPIcYCQKF2ktmFk8wubHbjuCM3DXf7B6I3z6OFqfRqYxrOlltwYWI7DtDyquMQjRsLAFWFA7Q8rqnZiM9+6uO4d/VOLH9sDdq28dUZjd+cqQmce/RUnDEngYl3PKE6DlHJsABQVYkbGs59+zyc+/Z5aNvWhQdXbsJDz2/Gmle4lZBGbt60JE5e0IDFCyZgztQEAEAM8K59VF1YAKhqzZvRgHkzGvCJ09PYuqsPDz6/GQ+u3ISWl3fA87ligF4nBZCeWYPFCyZg8SENmFEfUx2JqOxYACgS9ptYgw8vXogPL16Izr48Hl61BQ89vwlPtbbDclzV8UgBQxM49uA6LF4wAe+Y34CGJH8cUrTwXzxFzoSaOM45fi7OOX4u+gs2Hl+9FQ+u3ITHXnwF/QUuIKxmSVPDiXPrsfiQBrx9Tj2SJo+ZpuhiAaBIS8UMnN44C6c3zoLteni6dRsefH4znlyzFds6+1XHoxKYVmfi+Dn1WLygAUcfVAdD4+G8RAALANFuhiZx0sL9cdLC/QEAHb15rNq0E6s2dWDVpp14YXMHuvoLilPSUOoTOhbul8KhM5I4dL8aLNwviYkpQ3UsokBiASDah0m1cSw+bCYWHzZz9+9t6egrloFNHVi1uQMvbu5AznIUpoyuhKnjkP1qsHBaDAv3S2Hhfins38DFe0QjxQJANAozJ9Vg5qQavOfIgwAAnudj/fZurNrcgVUbd2LV5g60bu2E43pqg1YZXZOYv98ELDpgEhbNmoxFB0zC7Gn1sPu3win0qI5HFEosAETjIKXA3BkNmDujAWcfOwcAYDkuXnqlEy9s7sCmnb3Ytqsf27r6sXVXHy8hDKMhFcN+E2swoyGFGRNTOHByLQ47YBIW7D8Bps4Fe0SlxAJAVGKmruHwWZNx+KzJb/lY3nKwrasf2zr70d45gK2dfdjW2b+7JGzvGqja2QNdk5jWkNw9uM+YkMJ+E2owfUISMyakMKMhhbjJH0lElcLvNqIKips6Dp5aj4On1u/1457vY2dPDlt39aO9qx9bdxXLwrbOPnT05pG3HeQsF3nLQd52kLdcZYcaSSEQNzXEDR1xU0di8P1JtXHMmFBTHOAnpjC9ofjfyXUJSMEV+ERBwQJAFCBSCEytT2JqfRLAlBF9jeW4yFvu7kKQs51iQRj8vZzlIG8PlgbLQc5+vUAAeH0ANzTEzeL7cUNDwtQHP6YNflx/w4CvcUqeKORYAIhCztSLg3EdTNVRiChEpOoAREREVHksAERERBHEAkBERBRBLABEREQRxAJAREQUQSwAREREEcQCQEREFEEsAERERBHEAkDlZcZ8COmqjkEUKlJ6frLGUB2DqhtPAqTyaG+RAD6KL/zwGgAaPA/o7QR2vQp0vFr8767twI5tQG+X6rREFeenauBNmAivoQF+fQO8wTc/VQNIKYXU/11b+8eFQupXmLOXOKrzUvVhAaDSa2+pA/ArAGfu/j0pgfpJxbeDF77587dtAl78B7D6n0DPropGJaokv6YWzuy5cObMgzdl6tCf6zmak++6VDMS77XWP3CUOXvJKxWKSRHBAkCl1d4yB8A9ABYO96m7zTiw+Pbus4FXNgAv/h1Y/SzQ112ulEQV4ydTrw/606aP+utdOzfN99x11rr7zzDnnPZwGSJSRLEAUOm0t0wB8GcAB43tAQSw/8HFt1PPBTavBZ74E/DymhKGJKoMd+YBsI88Gu70/YBx3gbZc62YX+i5H+sfONycvYTfEFQSLABUGu0tJoDfY8yD/x6EAA6cV3xbuwp48PdAx/aSPDRROXkNE2AdfyLcAw8q6eP6nq27Vt/T1voH9jdnL+kr6YNTJLEAUKl8G8BJZXnkuYuA2YcCzzwMPNwMeNxUQAEkJaxjT4C9KF1c81IGnpOvE9J4CMCxZXkCihRuA6Txa2+ZBeCzZX0OKYHj3g1c/DkgWbP3z9F0wIyXNQZFl2+agKbt/WPxBPJnng073Vi2wf81rt13jLXu/hPK+iQUCSwAVArfBBCryDMdMBe49EvA1P3f+rGDFgCGWZEYFEG6Dnf/mW/5bW/iJOTOOb94rb8SfB+ek7+9Mk9G1Uz4vq86A4VZceFfOypdJm0L+Esz8M/HAdcBZs4GPvAxoLahojFIrULvK3AKPRV7PtHfj9if/wRt+zZA02AvXATr2OMBvfJn9hjJyQu5IJDGgwWAxqe95VIAtyp7/oG+4oLBREpZBFKn0gXgNSKfB+DDjycq/tyv0eMNt8bmnvExZQEo9LgIkMbrLKXPvq/1AERl5MfVrzXxXeu9qjNQuHENAI0XFyMRKeC5haGPEiQaBgsAjV1x7/9k1TGIosj3XGmtf4BTYDRmLAA0HvsBGN8RZ0Q0dr7fqDoChRcLAI0HpyCJlPLnqU5A4cUCQOPBfz9Eau39ZCKiEeAPcCIioghiASAiIoogFgAiIqIIYgEgIiKKIBYAIgoxHmVONFYsAERERBHEAkBERBRBLABEREQRxAJAREQUQSwAREREEcQCQEREFEEsAEQUXtwFSDRmLABEREQRxAJAREQUQSwAREREEcQCQEREFEEsADQetuoARBGXVx2AwosFgMZjm+oARNEmXlCdgMKLBYDGYzsAV3UIiq7I7wIULAA0diwANHbTG10Ar6iOQRRFQuqOOXuJpToHhRcLAI3Xn1UHIIoiqcfWq85A4cYCQOO1QnUAoigS0vyd6gwUbiwANF4PAOhXHYIoUoSEkNoPVcegcGMBoPGZ3jgAgD+IiCpIN1OPmbOX7FSdg8KNBYBK4XoAr6oOQRQFQmqe0GIXqM5B4ccCQOM3vbEXwLWqYxBFgWbW/tycvYRncNC4sQBQaUxv/BmAH6uOQVTNNLPm+djcMz6mOgdVBxYAKqXPo7gokIhKTOqJDqnHj1Wdg6oHCwCVzvRGB8BSAMtVRyGqJpqR2qiZqbnm7CU8+59KRvh+5A/TpHJob7kOwL+BJZPKKN+zBa7VqzpGWemxugdj8953quocVH34w5nKY3rjtwAcAeAPqqMQhZHUEzuMxKQPcPCncuEMAJVfe8tiAJcAOBPAVMVpqIpU2wyAkJon9fhaqcV+bM45/b9U56HqxgJAldPeIgEcC+AwAPsD2A9APQCxl88+DcCEyoWjMApDARBC86Ue27yXjwBC9Akht0PITULIxyHkz83ZS5zKp6QoYgGgYGpv+QuAxapjULDluzfCtQdUxxiS1ONdiUM+wDJLgcM1ABRUu1QHoODzfVd1hGEJIYPdUCiyWAAoqFgAaFi+56mOMDwhelRHINobFgAKqg7VASj4fD8Ml8tll+oERHvDAkBBxRkAGprvF98CTgjBMkuBxAJAQcUCQEMKw/X/IrFDdQKivWEBoKBiAaAhhaYAADPVSQAAIABJREFUCNGuOgLR3rAAUFCxANCQfC8kBQDYojoA0d6wAFBQbVcdgILN98KwABAARJvqBER7wwJAQdUGwFYdgoLLdy3VEUZAwPfsR1SnINobFgAKpumNNoBW1TEouDy3oDrCsKRm5OPz3x/8oBRJLAAUZKtUB6Dg8py86gjDElLnAkAKLBYACrLnVQeggPJ9eCG4BCCkzlksCiwWAAoyzgDQXoVh+h8AIOTfVEcg2hcWAAoyFgDaq7AUACHkn1VnINoXFgAKsvUA+lWHoODxnBAUACF9CPmY6hhE+8ICQME1vdEH8KLqGBQ8YZgBkNIYMGcvCcHtCimqWAAo6J5SHYCCx3NyqiMMS2jGWtUZiIbCAkBBd5/qABQsnpMPxTHAUhp3q85ANBQWAAq6hwEEf76XKsa1+lRHGJ4QgNR+pDoG0VBYACjYpjcOAOBCKtrNtYNfAKQW32XOXrJTdQ6iobAAUBjwMgABAHzfg2sH/wRAqRlPqs5ANBwWAAqDP6kOQMHgWv0AfNUxhiWk8VPVGYiGI3w/+N9MRGhv2QJgf9UxSK1C3zY4+S7VMYYkpO4mDz1PV52DaDicAaCw4GUAGpwBCDapx9apzkA0EiwAFBb3qg5AanlOAb5nq44xLCHN/1WdgWgkWAAoLO4FsEN1CFLHKQR76h8AhNQ8IbVvqM5BNBIsABQO0xttALepjkGq+HDy3apDDEvqyX+Ys5cMqM5BNBIsABQmXFkdUU6hF74fgtP/NPPrqjMQjRQLAIXH9MY1AB5XHYMqL+gr/wFA6vFuc85pf1Sdg2ikWAAobJapDkCV5bs2XDsMq//jd6jOQDQaLAAUNr8BEPyLwVQydhgW/wnpS2l8WXUOotFgAaBwmd6YA/Ar1TGockKx+M9IrjJmn9qpOgfRaLAAUBg1qQ5AleFafaHY+y+12L+pzkA0WiwAFD7TG58DwHutR4A1EPyjHzQjudWcc9rvVOcgGi0WAAqrrwHwVIeg8nGtXnhOCO78pyc+qToD0ViwAFA4TW9cBWC56hhUPlZ/GF79p14255y2QnUOorFgAaAw+1cAjuoQVHpOoQeeW1AdYxgC0kh8THUKorFiAaDwmt64FsDPVMegUvNhh+Hav5labc5e8rDqHERjxQJAYfcNAEF/qUij4OS74bmW6hhDEwJSi31EdQyi8WABoHCb3rgFwE2qY1Cp+LAGdqoOMSzNqHnWnHPaM6pzEI0HCwBVg28D6FAdgsbPzu0K/L5/ITRf6rGLVOcgGi8WAAq/6Y07AHxOdQwaH8+1wrHvP1b7P+bsJWtU5yAaL+H7vuoMRKXR3tIMYKnqGDQ2+e4NcO2c6hhD0oxke3zBWTNU5yAqBc4AUDX5BACexx5Cdm5X4Af/4tR/4gzVOYhKhQWAqsf0xm0ArlIdg0bHd+2wTP3/1JxzWovqHESlwksAVH3aW/4AgK/UQiLfvRGuPaA6xpCkntiROOTsqapzEJUSZwCoGl0BoEd1CBqene8M/OAvhPQ1I/k+1TmISo0FgKpP8WyAK1XHoKF5rgW7/1XVMYalxepu5Z5/qka8BEDVq73lvwB8VnUMeivf95Dv2hD48/41s+a5+Pz3N6rOQVQOnAGganYVgAdUh6C3KvS+EvjBX+qJDqnHj1Wdg6hcWACoek1vdAGcD6BVdRR6ndW/Ha7VpzrGkIRmWJqZOsqcvSTgNyUgGjsWAKpu0xu7UDwcqEt1FAKcfBfs3C7VMYYkhPR1s+4sc/aSjaqzEJUTCwBVv+mNLwG4AICrOkqUuXYOhb521TGGpcfqv2rOOe1PqnMQlRsLAEXD9Mb7AVytOkZU+Z6NQu8WAMFedKzH6n9vzn3Pv6vOQVQJ3AVA0dLecj2AL6iOESW+5yDfvSnwi/40s/aZ+PwzueiPIoMzABQt0xuvQfH2wVQBxcF/Y+AHfz1W+wQHf4oaFgCKnumN1wG4TnWMaud7NnLdG+C5wV5Ir8fq/hybd+ZJqnMQVRovAVB0tbdcDeAG1TGqkedayHdvgu/ZqqMMSY/Vr4jNe+9ZqnMQqcAZAIqu6Y0/BPBpBH1lWsgUB/+NYRj87+TgT1HGAkDRNr3xfwBcDsBTHaUaeE5hcPB3VEcZkh5v+Fls3nsvVJ2DSCUWAKLpjbcCyADIqY4SZq49EPzBXwjo8YYbY3PPuEx1FCLVuAaA6DXtLY0A7gYwS3WUsLFzHbACfmc/IXVHj9V9yJxz+p2qsxAFAQsA0Ru1t0wGcCeAU1RHCQPf92D1boVj9aqOMiSpxzs1s+Z4c/YS3heCaBAvARC90fTGnQBOA3Cj6ihB57kF5LteDvzgr5m1z2pmzXQO/kRvxhkAon1pb/kQgCYACdVRgsYp9KDQtw3wA7x2UgjosfqbYnPP+KTqKERBxAJANJT2lkMB3A7gbaqjBIMPq2877Hyn6iBDklpsQDNrLjTnnHaP6ixEQcUCQDSc9hYDwNcAfAWApjiNMr7nIN+zBZ4T7M0Seqz2MaHF3mPOXjKgOgtRkLEAEI1Ue8txAH4BYL7qKJVm5zth978KP8BT/kIzLN2s/aQ55/RbVWchCgMWAKLRaG9JAvg+gE8BEIrTlJ3n5FHo2wbPyauOMiTNrHle6vFTzNlLdqrOQhQWLABEY9HecgqA/wZwqOoo5eD7HuyBHbBzu1RHGZLUzIJmpr5qznkP7+lANEosAERj1d6iA/gMgH8FUK82TOk4hR5Y/dsDfaKfENLXzNpmoRkZc/aSYE9PEAUUCwDReLW3TAGwBYCpOsp4eK4Fq68drt2vOsqQNCMJaSQXmrOXrFGdhSjMWACISqG9pQthnQXw/eJRvrmdQIB/Hkg9Bvg+fM/xk4ddwEPMiMZJVx2AiNTwPRdOvhN2fhd8z1UdZ5+kZkJIDa5d3H4oBMd+olJgASCKGN+1Yec6YBe6A32Sn9TjAIo7ERDcfkIUWiwARBHhOXnYuQ44hR7VUYYk9QTge4HfekgUdiwARFXOtfpg5zrg2gE+GE9IaHocvucE/qRBomrBAkBUhXzfg2v1ws51wHMKquPsk9TjgBDwnUKwCwpRFWIBIKoSvufAtXrhWH3FrXwBXdEvNANSGvBci9P8RAqxABCFmOcUdg/6QZ46F9KA1Az4ngvPLcB1bdWRiCKPBYAoVHy4dm5w0O+FH9CBVEgNQprF6X3Pgu/acL1gZiWKKhYAopDwXRtWrgOePQDPDdZ1fSEkhGZCCFlcyOda8L3gzkgQEQsAUWgIzUCsZnrxF74Pzy0U35w8PKf4frnP7xdSL74NHsbj+y58z4XvOfB5PZ8oVFgAiMJICEg9XlxFH3v9BOLiNXYL8N3XB2ffBXzvDe+78D2v+D4GT9YTWvHVu+9BiLfe5Xj3ID/4RkThxwJAVEWE1KDJxJi+1nNyyHVtKG0gIgosHqpNREQUQSwAREREEcQCQEREFEEsAESloakOEBXBPN+QKHxYAIjGq70lBqBGdYzI8D1hrX+gTnUMorBjASAav6mqA0SO7y9UHYEo7FgAiMaPBaDi/HmqExCFHQsA0fjNVx0ganzfO051BqKwYwEgGr/FqgNEje85p6jOQBR2LABE48cCUGGea81VnYEo7FgAiMajvWUagENUx4ga37VMa/0Di1TnIAozFgCi8blYdYCo8l3726ozEIUZCwDRWLW3CACfUB0jqlxn4Axr/QP8GUY0RvzmIRq7UwBwO5oivmsb8NyrVecgCisWAKKxy6oOEHWuk/+i6gxEYcUCQDQW7S1nADhDdYyo85zcFGvtn76mOgdRGAnf5601iEalvcUE8Dyq7AAgz8kh17VBdYxRE5ph6bH6SebsJX2qsxCFCWcAiEYviyob/MPMd23Td63fqc5BFDYsAESj0d7yLgDfUB2D3swp9J5mrbvvKtU5iMKEBYBopNpbDgJwFwBdcRJ6Cx9OvvsH1rr7T1KdhCgsuAaAImX+WVfs7/v++wHUABgAkIMQW9qamx4Y8gvbWyYCeAjAEeVPqUZY1wC8kdTMnBarO9ycvWTdUJ83+8xLPwrfnw0gBR81EOgRQv503b23rqlQVCLlWACoas0/64rjfd870/O8t/u+d4jnulM9z93rq3dNN7p03bi+bcUt33nLB9tbZgH4I4Cqvgd9NRQAAJCaWdDM2lPMOac9uefHZr/3oz9zXftDvu/vaxbHF0IWhBTbpJD/gNR+tf7eW+8uc2QiJVgAKPQWnP2JlOd77/M9b4nve0d5nnuw57r1vu+J0T6Wpuk53Yhd1bZi2c0AgPaWRgB/ADCjxLEDx3Mt5DqHfOEcGkLqnh6ru8icc/qdADD7fR/9vuvYWd/3x3TZUwjhCCE7hZSrhZB/kEI0rb331s7SpiaqLBYACpUFZ3/iYM93z/Y9752e5x3ue+5+rusmgNL+O44nkve/+JNPPalL+UUAyZI+eED5voeBjpdUxygdISG0mocOz951oG3bpb97oBCeEKJfCrlRSPmYFPKWtffe+s+SPw9RmbAAUCClM1kBYC6AIzzXfftAf9dFnutO3tcUfjlMnVCP337lAhw0raFST6lcf8caoEp+Jqzc1I0P/+gJWI5b0ecVQhZ03WgRmva4EPI+ATzY2tzkVTQE0QiwAJBy6Uw2CeBwFBfYNQ7+N43iQj0AQK6/B4V8f8Wz6bqOb3x4CT70rsMr/twq5DrXw3MLqmOM2/fveQk/e7hVdQwAgBDCl5reJ6XcJIR8Vgj5sBBiRWtz007V2SjaWACootKZ7Ay8PtC/NtjPxzBbUn3fR1/3TriuU/6Qe3HKkQtw65VnQVb5xlmrrx12PryXtl0PWHr9I1i/vUd1lGFJTbOk1Nql1FYLIR4XQt7b2tzUojoXRQcLAJVFOpPVACzAmwf6RgBTx/qYruugr3snVP2bndJQh9985QLMnj5ByfNXglPoQaH3FdUxxuS5jV245MdPVnzKv5SElJ6UWqeU2joh5DNCivsExH2tzU2W6mxUfVgAaNzSmWwdilP2bxzoFwGIl/q5Cvl+5PrVvbrTNQ1f//ASfOSUtLIM5eR7DgZ2tamOMWrfXbEat/1lreoY5SEENKn1S6ltEVKuFEL+RQjR3NrcFM6mRoHBAkCjks5kD8RbX9UfDGDUW+7Gqr9nF2xb7XXqk4+Yj1uvWgq9Cq8J5Ls3wrUHVMcYEcv1sPT6x7Dx1eBP+ZealJotNW2HEPIlKeWTg5cQnlKdi8KDBYD2Kp3JmgAOxZsH+iMAKJ//9j0PPd074HtqF1ZPqq/FnV++APP3m6g0R6mF5TLAP17uxKU/+SvsEE/5l5oQ0pea1i2l9rIQ8p9CigcExP+1NjfxTon0FiwAhHQmOxFvHugbUTz1zlCZayi2VUB/7y7VMaBpGr528btx2amNqqOUkI+BXW3wveAOrN++ezV++WiVTvmXgdT0vJTaK1LKVULIx4QQd7c2N1XHqU80ZiwAETK4t34O3vqq/gCVucZK1dbAvXlHei5uu/rsqrkkYA3sgD0QvF1qluvh/d9/FJt29KqOEnpSaq6U2k4hZZuQ8mkh5B8F8DDPLIgOFoAqls5kFwB4J15/Vf+mvfVhp3pr4J4m1tXizi+fjwX7T1IdZfx8DwOd6+B7wfizBYC/revE5Tf9FbYb3JmJsHvDmQUbhZDPCil/3da87E+qc1F5sABUmXQmOxvABYNvVXvnuteo3hq4J03T8JUL34WPn/421VHGzSl0o9C7VXUMAMC//e4F3PHEetUxIklqek7XjceE1L7T1tz0iOo8VDosAFUgnckegNcH/aMVx6k41VsD9+aERXNw+9UfgKGH+5KA6h0BluPifd97FFs6uIYtCDRN79d042EptW+1Njc9rToPjQ8LQIilM9mTAVwJYCmGOUmv2vX37oJtBesI2wl1NbjjS+dj4QGTVUcZM9+zkevaoORSwNNrd+Hym5+Cwyn/QNINc5umGd9vW7HsRtVZaGxYAEImncnGAVyE4sBfnafRjEFQtgbuSdM0fOn8k/GJM45SHWXMXDuHfPdGlPqOi0P5f79Zhd/89eWKPR+NndT0vK6by6WUV7c2N3WpzkMjxwIQEulMdgKAqwH8C4ApiuMEkm0X0N+jfmvg3hx36MH49Rc+GNpLAk6+C4W+bWV/noLt4r3fexRbd3HKP2yEkJ5umE9qmn5Ja3MT21sIsAAE3OCd8q4E8EUA0bkv7RgFaWvgnhpqU/j1F8/Holnh7G/FRYHbUK6ZgCdad+ITy56G4wZrFodGRwjhG2b8ASm1i3nHw2BjAQiodCZrALgcwNcAzFAcJzx8H70B2hq4J01quOb8xfjUe8O5VtO1+1Ho2QLfL+0gfd1dz+N3T20o6WOSWkJKzzBid0mpfay1uSkcZ0tHDAtAAKUz2fMBfAfFQ3tolIK2NXBvjjnkICy/5oMwDU11lFHzXAtWXztce/wzLXnLxXu/9wi2dQZz1obGT0rN1s3Yj9euuOUq1VnozVgAAuSH333P29598KY/betNTfl/j5yAvKOrjhRaQdwauKf6mhR+/cXzcPhBY75DslKu1YtC/3b4rj2mr39s9Q588ta/weWUf1WL6y7+39ufRkPctv53/aIP/PQn9/1BdSYqYgEIgHQmKz99TMtPzj/0pY9PiBcEAKzpmIjP3/cubO1NqY4XWkHcGrgnKSWu/uA78bn3H6s6yhj5cO0BOIUeuFbviO8fcO0dK9H8t41lzkaqzUj144aTH8OCiZ0AgM58DDevOvqJezYcenJrc1Mwr9NFCAuAYh/+/CVHfujw1X88fc6GaXt+rCsfQ/aBxXhm63QV0UIvqFsD9+aoBbNw5xfPDeUlgTfynHzxzS3sfv+N6wVyloszvvsItndxyr/aHTXtVXx/8eNoiL21hK9YP9e+/aWjLvzLr+/4vYJoNIgFQKHrvn72f17xtpWfPbC+V+zrc1xP4Pt/PQbLVx1SyWhVI8hbA/dUl0ri9mvOxZGzq6vw+a4Nz83j2bVbkfnhH1CwxnbJgMLjggWtyB7zT2hi3+PLpt5a/PDZEx771bI/vbOC0egNWAAUWPrJj0++aNHqx85b2HqIJkf25/+/a+biW48dD9sL5z5ylYK8NXBPUkp87uyTcPXZx6uOUlI/vPsp/Nfdj8MLwWwMjZ0hPXz5uGdw1tyR3bfB9QVue/Hwvt+vTx/59F238/7OFcYCUGH//u33nX3W/HV3HDqlIzbar31k40xcff/JLAGj5fvo7e6AO8bFaiocOe9A3PmlcxE3w70QNG85uOB7v8WzbZtUR6EyM6SH6xc/jnfMfGXUX/v8zsn+bWuO+uJtN//pB2WIRvvAAlBBd/3PSb86c976i5LG2Aeixzbtj6vuPxmWG+5rxZUWhq2Be6pNJfGL7Adx1NxwHgPxj7XbcMkNv0NvP7eAVztT8/CDxY/hxP3HfvfIAdvAL9ak//617//9mBJGoyGwAFTAx7IXxy9Jv/j84llb5pbi8f788oG4+v6TS/FQkVLIDyDX3606xqhIKfGZpSfiC+e8XXWUUfnB7/+KH614glP+EXH94sdxyoGbS/JYf9gwp/e2NUfNfOhXdwZ7H28VYAEosw9++rIJVx737IvvPHBLSVd2ffXhk3BP6+xSPmQkhGFr4N4cMWcm7rz2PCRjhuooQxoo2Ljgu7/Bc+u2qI5CFfK+2RvwjRP/WtLHvH/jQdaPnz9x3pN3/pLXjsqIF5PL6JxPfezAq4//x/pSD/4A8KUT/oYpyVypH7bqJVMNkDJ8/+yfW7cFR195E55pHfsUa7k907oVR195Ewf/CJmcyOELx/yj5I972qwN5lVHPLb+7Rd8KJxnZodE+H4ShsQHP33Z4V868Zk1Jx6wtSw38KmLWbjyuH+W46GrmpASyZpw3lOpbyCH877za3zvt0+ojvIW3/vtEzjvO79G30A4S6mm6xCCPw5H67NHPoc60yrLY598wCbt2rc9/LcTLrzozLI8AfESQDl88NOXvfMrJ/3tz0fN2F7W+VrL1XDqL89FV37UGwoiL0xbA/dm0ez9cde156EmbirN0Ze3cP53f4NV60e/8jsoYvEUEqk6AIDnuXAdB65rw3VsuK4DL6A3llKtIVbAHz94N0ytvOs8/t4+zf/m30/5xJN3/rqprE8UQay8JXb5Fy4+4V8X//XBcg/+AGBqLs45pK3cT1OVEslaaFqwr6cPZdX6V3DMlTfhqZfUDbxPvVTMEObBX9MMJJK1u38tpQbDjCGeqEGqdgLqGqagfuJ01NRPQiJVDzOehKYbEGKfZ3dFxtlz15V98AeAo6dvF9887s83L/nQeZeU/ckihjMAJXTt18459tLGVY8vmNRZsZFlQ1cdlt55dqWerqqEcWvgnqSQuOJ9x+Mr559U0ef9zl2Po+n/noJX4tsCV5IQAjX1k6FpYztroTg7YBdnDBwbrmtHatfD78/6P8yqq9xC/dW7JuLG50487/e3rvhtxZ60yrEAlMgP/v2Mo85Z2PbX2Q3dFX9Z+Y6fX4DuAi8DjEUYtwbuzaEH7YfffuX8sl8S6MtbOPc7d+HFDcFdjDhSiVQ9YvFkSR/T97zBywdvvoxQbepiFh4+/3cVf951XQ3+zS8cu/RnN913b8WfvArxEkAJ/OzGdx2RWbRGyeAPAIdN6VDxtFUhFk/CMMNfnl7csBXHXHkTnlxdvhX4T67egmOuvKkqBn/DjJV88AeKi0x1I4ZYIoVkTQNqG6agYeJ01NZPRrKmHrF4Crphhv4SwqGT1NxfY05Dl/hM+q8rPn/lyacoCVBlWADG6ZNfzEw8fubWJ/ev7VN2QflQFoBxCevWwD315/LIfPcOfPOOR0v+2N+841FkvnsH+nP5kj92pUkpkUxVcCeIENB0A2YsiUSqDjV1k4rrCuomIRZPQcrwneq5cKK6G2wdWNsrlh704gOnf/i8A5WFqBLh/6mnUDqTFUvnr3tm4eRdpX8pMQq1ZdqGExVh3hq4J9/3sOwPT+G0625HT278Bx715Ao47brbsewPT73ptr5hlqxpgAhA4dMNE4lUHeomTEVt/WTEk7XQ9HAsTFX9M+fwyTvkBw5+fvX8s65Q/xcZYvzDG4dPHv3cXWfMfVn5cXxyhHcUpH3TjRhi8ZTqGCWzZtM2HHvlzXj0hbEfpPboC5tw7JU3Y82mbSVMplZxCj54l3w03UA8UYPa+smomzAViVRdIHO+Zqjb/FbKB+e9lHz/QS+sUp0jzFgAxui6r5/9mY+kXzhXdQ6Af4mlkgjRK7CRGMjn8eHv34mv/+qRUX/t13/1CD78/TsxkA//lP9rNP3NW/6CSkoNsXgKNXUTUT9xOpI1DTDMRKDWDYgAFAAA+Fzj3xZecPl7l6nOEVYcO8bgks9fcszlR676z6QRjNW9fVb1DFpKCVGcHg7QD9rx8n0fP7vvaZz61V+gu3/4SwLd/QWc+tVf4Gf3PR3q7ZF7EoN/twjZ360QAmYsgVRtA+omTCuWgQDMDPRZag+gek1Sd5BtfOLyky++4ALVWcKIBWCU0pls7UcbVz10UEN3YP7s2jqr4/p1EGiajniyTnWMkmvd3I5jr7oJj6zauM/PeWTVRhx71U1o3dxewWSVEU/WjXm/f1DsLgN1E1E/YRoSqTplM1bruuqVPO/eHFzfgysWPv3r+WddEc77ZisUmEEsLL7w9r8/cMpBm2tU53ijto4JqiNUleLWwLjqGCWXyxdwyfV34brbH37Lx667/WFccv1dyOXDd6fE4RhmvCxb/lQSUiIWT6G2fjJqG6Ygnqip6G6CtV3BetGxZNZGefG8fz6nOkfYsACMwn9ff9oXL1q05jjVOd6ozzKxuSf41zXDJllTXxVbA/fk+z5+8cAzePdXbkNnXx6dfXm8+yu34RcPPFNVU/6vkVIiWROcV6vlUJy1qkXdhKmoqZsEM5Ys+2Wszb016LODdenxisOfnfLpz7zrNtU5woQnAY7QzT9898JzDmlbNSWZC9SocOcLC/DtxwPVSaqGYxfQ16Nuv3O5TY4Vp8R3FoKxlqUcauomBno1fbn4vg+rMIBCrh+e55blOa499u84b0Gw7kWyYyCJH6867h0//u+HHledJQwCNZgF2Ykzt/4laIM/APx29XzVEapWtW0NBADp+0hYBaQ62pHbsA65DeuQ6mhHwipAVtmLgaBu+asEIQRi8RTqJkwtzmaVYf3D79vmlvwxx2tKcgBnzlrzZ9U5wiJwA1oQ3Xrju/5r0dSdU1Xn2NPK7VPwEq//l1UiVR1bA3XPQ3KgD4lXt0B2tAPWG671WwXIjnYkXt2C5EAf9Cq4oY2mG0ikeGkMAMxYEnUNU5CqnVDSf8utnQ14fufkkj1eqRw9bVvsS1edyBIwAiwAwzjvM5dNPfXgTZ9SnWNPni/w3SePUR0jAsK9NTDmOEh170Js+2aI7g5gqMHd8yC6OxDbvrn4NU44Lw3s3vKHcP6dlYthxlFbP7mkl0Wuf+Zt8Pzg/TmfN3fVu0+48GJOjw6DBWAYS+evu+vA+p7AHdb9y+cXYtWrwWvf1ShsWwOlDyQKOaR2boO+4xVgoHf0DzLQC33HK0jt3IZEIYcwHTZZDVv+ykk3Yqipm4ja+snj3u3yws5J+PXqBSVKVjqz6npw+gEvPaQ6R9CxAAzh41+46Ngz569frDrHnjZ11+JHzzSqjhEpYdgaaHgeUv29SGzfDLnrVcAuwXnttgW561Uktm9Gqr8XRsAvD1Tjlr9y0XQDqdoJSNVOGNcWwp88l8bm3uBdbsnMX7X/kg+fxwOChsACMIQz5m64Y0I8WEeh5hwdVz9wMvIOX+FUWjC3BvqI2TZSXR0wt28GenYB5bhpj+8BPbtgbt+MVFcHYrYNIFjTAlHY8lcOhhlHbcNkmLGxFae8o+GaR05C3gnWROmEeAHvO/DFn6nOEWRB+2kWGFd++fxL3zdv/cGqc+zpaw9gRwRTAAAUJ0lEQVSfiFYu/FNCiODcNVDCRyKfQ2rHNug7twK5vso9ea4P+s6tSO3YhkQ+BxmQIlBcq8EfaWNR/Lddj5q6iWOaDWjrbMC/Pnl8GZKNz3nzXkos/ehZN6rOEVT8btmLdCarLZ2/7saYVp79s2N1y7OH4/71s1THiDTVWwMNz0WqrweJ9s2Qna8Cjq0sCxwbsvNVJNo3I9XXA6NM+81HIspb/kpJN2KobZgypssoD2w8ED9fdWgZUo2dqbk4f87Kz84/64pg3LwgYFgA9uLCw1768ikHbwrUqq9HN83kdf+AqPjWQB+I2xZSnTtgbt8C9HYCQdqz7/tAbyfM7VuQ6tyBuG1V9OoAt/yVlhACiVQ9auomjfr8gB+3pPHEK8E6kv+0gzbIE6Zv+JXqHEHEArCHdCYrls5f9+UgbWzZ0FWHax88KZDbbaKpMlsDNd9DMj+A1I5XoO3cBuQHyvp8JZEfgLZzG1I7XkEyPwCtHOsR3oBb/spHN0zU1o9ubYDnC3z18ROwKUCLAgWAixc8d878s67geLcH/oHs4asnPf2dRVN3BmYZcZ9l4nP3nRKY229SkabpSJRpa6Dpukj1diG+fQtE5w7ADeF+fNeB6NyB+PYtSPV2wXTLc3kgwS1/ZVUsWPWIJ0c+oPdaJrIPvwMDAbpXQOOUV2Vm/nO/UZ0jaFgA9jBg65eozvAazxe49sGTsKErUFcjaJAZTyKeKM2NIYu3ek2ixrZhvLoF6OsO1jT/WPk+0NcN49UtqLHtkt6oJp6ogcktfxURT9SMaofF+u56fO2J4wOyPLTIQOH9qjMEDQvAG6Qz2ff8x9NH7Xfdwyei4Krf0vKjZxrx6KaZqmPQEOLJ2nGVACm13XdyS9bUQ582E2IUr7bCQiRroU+biWRNPeomTEU8WTuuvefxRM2oXpXS+JmxJFJ1E0dc4P6yeSaWrVxU5lTDs1wNX3/yeDQ9d6gxb+nl16nOEyQsAG/2JQBY0ToHlzafju396l5d3L9+Fm559nBlz08jF0/WIpGqgxjFGQG6YSJVO6E4GCZqXt++JiT0WQsgAn7o0GgIMw591gJg8P+jEBLxRA3qJkxFqnYCdGPkl7eElEik6jj4K2IYsVFthW167nD8ZbO6FzHbB5K4/L5Tce+64o5ux7GzysIEEG8HPCidyc4B0IY3rCaalMjjh6f9BUdOf7WiWVo7JuDDd5+BHA/7CZXhbsGq6QZ03YQZTw573dq38nDWrQrn9f830nTocxYNW2hc14GVH4DjWHD3srVRSg2xRKoi97qn4VmFAQz0dY/oc5OGjV+ccT8Oru8pc6o3a3l1Cq555CTsyr/5314sUXNKW3PTwxUNE1AsAIPSmey3AHx1z9/XpYdrT3wG5x/6UkVybO1N4dIV78G2vuq6DW3U+L4Pz3Phey4AAU03Rj1w+f29cDa8GN61AEJAP+hQiFFu0fN9f7AE+BBSg5QaB/0Ayuf6kB/hfSb2r+nDstMfxLRkZXay/LZ1Hq5/5m1wvLfOyhlm/Il19956UkWCBBwLAIB0JisBbABwwL4+55xD2vDVdzwNQ5ZvW1N7XwqXrjgdr/SWZmEZhZ/XtRPulrWqY4yJNnMuZANvWFXNBvq6YBVyI/rcA2p7cfNpD5W1BNiexHefPhp3r52zz8+RUnPNWCLe2twU8um18eMagKJTMcTgDwC/XzMPl604HTvKtC5ga28NPnbPaRz86U1kw2RoU8O3EFSbOvP/t3cvsXZddx3Hf2vvfc65D99cP3BM7SRO+nLTh1UVWgmUMgAk1IYqUqFFFgOkDgITJlwVCSEhGLUM3M5AckPLCKuAVGyrDIoY0Ugw6AALN811mqI6rh3b8fX1fZ7H3ovBcUri53mv9V/7+5E8sXzv/m2fx/rttdfem8G/BuYXl5Xlgy3mvLSxpD/83q/rytZ0Zjev78zrxe/9xkMHf0mqqjL33n95KiGMoQD0fWmQf/Tfbx7U5//pczq3+t6JbvxfXn2/fvefP6dLt1nYhHtljz+hbO/B0DEGlu09qMxgacHw/v9GTIO5tLGk3zv3GZ398WS/Q7/7+tP64rnP6vz1wUpnWXb/aKIBjKr9KYDjJ1aWJb0paagbiX/6qcv68+f+U4eXtkbe9hu3l/TVlz/JpX54NO/V+99X5Ldmu5BqWG7xMRVPPytxzr5Wdrc3tDvkA6meO/Iz/emnfqAje0Z/kNWVrUV95b9+WS9fPjzcDzqnubnFp1bPnLo08sYTQAE4sfIFSf84ys9mzuvTT13W73zoon7t6BvK3KP/Lyvv9P1LR/TtC8f08qXD3N4Xgyt76r1+QX7Ac66z5lrzKt77EYk789XSxq3rKoe8aiVzXr9y+Iq+eOyifvXwlYG/Q//j8mF95+L79PLl0b9Dm3MLX3/t7Et/MtIPJ4ICcGLl7yX9wbi/Z9/crj76+Fs6duCmjh1Y0775XXnvVHlpq9vQj27s14XrB3Th+i/o1i5PLcNoor08cMDL/ZCubmdXWxtrI//8cqutjxy4qQ8fuKlj+9e02OjKOa9M0lq7pdWbe/Xq2j798K0DWpvAd2jRaP349e9+6/1j/yLDal0Ajp9YcZKuSDoUOgswKL+9od5PXpGm/KCdgblMxTPPJnkHQwxnc/2GeiEfUT0El2VVq7XQWD1zKpIP0uzVfRHgL4nBH8a4hSXlTzx8pfMs5U+8j8EfkqS5KT0gaxp8VWXe+98PnSOkuheA50MHAEaRLR9QfuihV67ORH7oSWXLB0LHQCSKRlNFw84pzqoqB7oCLFV1LwCfDR0AGFV28IiyfY+H2/6+x5UdPBJs+4hTy9ATGquy98nQGUKqbQE4fmJlUf1TAIBZ+eFn5IZ4TOukuD3Lyg8/M/PtIn6N5txQD8YKqSx7ix984cVwLTowG6/SdHxCUvhn/gLjcE7Fkx+Qa83PbpOteRVPfoBr/fFAzRm+H8flvf9C6Ayh1LkAfCp0AGAi8kL50Q9JRWP62yoa/W1xrT8eotmycxrA++q3QmcIhQIAJMA1WyqOHpOmOfWaZSqOHpNr2lnkhTDyvFA+i0I6AVVVfjx0hlDqXOMpAEiKm9+jbP8h+Y1b0/n9S3vl5nlYFQbTaLTuPNY5blVZvid0hlBqeSOg4ydWDkq6FjoHMGm9n/xwas8LcIuPqXjmw1P53UhPr9vW5u2boWMMZG5+z7OrZ079KHSOWavrKYBPhA4ATEWnbfN3Izl50QwdYWDeV58PnSGEuhaAyT6LEoiBr+S70xukfbcdz+2HET3nnAojJcB7/7HQGUKoawE4GjoAMGl+Bkfos9gG0lE0zBSAp0NnCIECAKSis5vGNpAMK1cCeF8dDp0hBAoAkAhmABCbLLdxrzVf+X2hM4RAAQAS4WdwdD6LbSAdWWbjSvPKl3buXDRBtSsAx0+sNCXV9rpPpIsCgNg450w8F8BXVf7BF16s3U0u4n9lJu+gJG5ijvS0ZzA4z2IbSEpuZBZA0rHQAWatjgVgMXQAYOK8n+olgD/fTLct1fDmYRidmXUA8gdCZ5g1CgCQAN/tzGZg9r6/LWBAFk4BSJK8KAA1UMvFHkjcLM/Nsw4AQ3B2zrguhw4wa3UsAMwAIDmzXJzHQkAMwzkzw0ztLgU088pMEDMASA4FANFyVmYA/GOhE8xaHQsAMwBID6cAEClnpAB4zymAOrBxb0pgCLO8Qx93A8QwrBQASTYeXDBBdSwAQHI4BYBo2SkAtUMBAIzz3Y5UzfAxvVXFpYBAAigAgHUhjsiZBQDMowAAxoWYkuc0AGAfBQAwLsSiPBYCAvZRAADrOAUAYAQUAMA4TgEAGAUFADCOAgBgFBQAwLKyJ5VlgO2W/W0DMIsCABjm2+GOxENuG8D4KACAYSGn4jkNANhGAQAsCzkIUwAA0ygAgGHMAAAYFQUAMCzkDXm4GRBgGwUAMIwZAACjogAAVlWl1OuG236v288AwCQKAGBUDEfgMWQAMBoKAGBUDNfhx5ABwGgoAIBVMSzCiyEDgJFQAACjYph+jyEDgNFQAACjYhh8Y8gAYDQUgMR4VmXXRwyDbwwZMBN8t6SnCB0A49vZuqXO7pZ63baqsifnMhXNlhrNeS0s7Zdz9Lzk+Eq+2wmdop/BVxLvseR4X2l746a6nR31Om15XynLCxWNlppzi5pf3Bs6IsZEATCs7HW0sfamup2dd/2995W67R112zva3b6tpX2/qGZrIVBKTENMd+HznbZcaz50DExQp72tjbWrqu565HNV9tQpe+rsbqm9vaGlfYeUF81AKTEuartRZa+rtWs/vWfwv1tV9rR+4w21dzZmlAyzENO595iyYHztnQ2t33jjnsH/bt3Ojtau/VRlyJtRYSwUAKM21q7K+2rgf79565oqzuGlI6br72PKgrFUVanNW9cG/vfeV9pYuzrFRJgmCoBBu1vrjzzyv1tVldpcH/yDjbjFdNQdUxaMZ3N9+AOFbmdHu1vrU0qEaaIAGNRpb432c7vbE06CUGIadGPKgvGM+h0x6ncSwqIAGNQbcQGYr0qVJefrkhDToBtTFoysLLsjX+o36ncSwuIqAGN8VY01iPe6beV5Y4KJ7lX2uv0vEz/VzYwtyzLlRUNZloeOMhzvo7gE8G39SwG95FzoKEOpqlJlr6uqGnwtTQjOSXneUF5M93Pb644+iPfLQyWXcUxpCQXAmGEW/j3gF0wmyH30um1tb66bW2xYNFpa2LNspgj4bnuqr+PQvJfvtuWac6GTDKSqSm1vro814IWQZbkW9iyraLSms4Ex31PeV3JMKpvCq4WJ6HXb2rx909zgL93Jvn5j/HI1KzFOuceY6T68r7S5fsPc4C/dWch7+6bJ7IgTBQATsb1pexVwVVXa2bJxr4SYbgL0thgz3c/O1kb0U/6PYv2zhnhQADC2/nlUe0f+d7NyZOUjvO4+xkz3Y+U1fpi31y4A46IAYGypXFlQVaWN0wAxTrfHmOku3ldJFFUpnc8cwqIAYGwxrUcbl4V9ifG6+xgz3c3CazuolPYF4VAAAGNiPN8eYyYAD0cBAAz5+eN3YxPJ44kBDI4CAFgS81R7zNkA3IMCABgS87n2mLMBuBcFADAk5kE25mwA7kUBACyJ+Xr7mLMBuAcFADAk5tX2MWcDcC8KAGBIzNPsMWcDcC8KAGBFryvFfCe7quxnBGACBQAwwsIRtoWMAPooAIARFgZXCxkB9FEAACMsLLKzkBFAHwUAsMLC0bWFjAAkUQAAM7yB6+wtZATQRwEAjLBwft1CRgB9FADAgrLX/xM7KzkBUAAACywtrrOUFagzCgBggKWpdUtZgTqjAAAWWBpULWUFaowCABhg6ajaUlagzigAGFuWpfM2cs6FjnBflgbVWLPG+tqOIqXPHMLhXYSx5UUjdISJyPMi2kHC0vX1sWZ1zinPi9AxJiKVzxzCogBgbFmWq2i0QscYW3NuIXSE+6sqW0/Z63X7mSMU7Ws8hKLRUpbloWMgARQATMTCnmXT05KNZkutucXQMe4r1in1h4k1c2tuUY2m3bKaZZkW9iyHjoFEpDEfhuCyLNfS3oPa3d5Qt9NWFfNz698hLxpqthbUivjIMNbB9GF8Z1cu0v/TxaX9au9uq9PeVmlkZiXLcjWaLc0tLMk5u0UbcaEAYGKcyzS/uKz5Rcn7St6HTvRwzrloz/m/i8Ub60SeuTXXL33ee/nI36jOiUEfU0EBwFQ4l8nC2GqB1RkAC8yUQGAKqJVA5KwMpu9kMTNQNxQAIHYWB1OLmYGaoQAAMfNevtsJnWJovttR9ItAgJqjAAAR8522zYHUe54KCESOAgDEzPJUuuXsQA1QAICIWV5MZzk7UAcUACBilgdRy9mBOqAAABGzPIhazg7UAQUAiJnlhXSWswM1QAEAImb5KNpydqAOKABApMxeAvg2LgUEokYBAGKVwhF0CvsAJIoCAEQqhSn0FPYBSBUFAIhUCtPnKewDkCoKABCrFI6eU9gHIFEUACBSKUyfp7APQKooAECkUhg8U9gHIFUUACBGva5UVaFTjK+q+vsCIDoUACBCKR05p7QvQErqWAASOKxC6nw7nUEzpX1B0srQAWatjgXgRugAwKOkdNSc0r4gXc7pZ6EzzFodC8CV0AGAR0pp0ExpX5Awtxo6waxRAIAIpXTUnNK+IF3OuQuhM8xaHQvAm5KuhQ4BPExKd9BLaV+QJpdllaT/CZ1j1mpXAM6fPuklnQmdA3igstf/k4rU9gfJKfLG6uqZU7VbIF67AnDHd0IHAB4kxSnzFPcJ6cjy/B9CZwihrgXg3yVdDR0CuJ8UB8sU9wlpcFlWOZd9PXSOEGpZAM6fPtmR9FehcwD31U7wnHmK+4QkNBqtb6+eObUZOkcItSwAd7wk6dXQIYC7pXi0nOI+wb4szztZln8pdI5QalsAzp8+2ZP0x+LOgIhMioNlivsE+xqNub9YPXOqtm/O2hYASTp/+uS/Sfpy6BzAO6U4WKa4T7Ct2Zo/e/HsN/46dI6Qal0AJOn86ZNfk/TN0DkASVJVpvn0vF63v29ABIpGa/W1c3/3QugcodW+ANzxoqSvhQ4BpHzTnJT3DXY0mnM/KIrGx0LniEEROkAMzp8+WUpaOX5i5YKkv5XUDBwJNZXyVLnv7MrNLYSOgdpyarbmv/XauZdqu+jvbswAvMP50ye/Kenjks6GzoKaSrgAJL1viFpRNK+25hd+m8H/3ZgBuMv50ydfkfTC8RMrz0n6M0m/KWYEMCO+ne4gmfK+IUZORdG4nheNv7x49ht/EzpNjCgAD3D+9MnvS3r++ImVxyQ9L+kzko5KOizpPZIWA8ZDolI/BQBMg3NOzmVdl2XbzmVvZVn+r1mWfXX1zKnLobPF7P8AhP/Eg5+1UDUAAAAASUVORK5CYII=","subType":"00"}},"__v":{"$numberInt":"9"}}
