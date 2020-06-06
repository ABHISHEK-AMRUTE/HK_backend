const express = require('express')
const users = require('../model/user')
const contact = require('../model/contact')
const community = require('../model/community')
const multer = require('multer')
const upload_image = multer({

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

const app = new express.Router()


//// adding user to the community 

////query parameters 
// community_id : chat_id of community,
// user_id : _id of user to be added,
//  username : name of prso nto be added
//  name : name of the community

app.post("/add_to_community", (req, res) => {
    let _id
    users.findOne({ userid: req.query.user_id }).exec((err, result_user) => {

        _id = result_user._id
        console.log(_id)

        community.findOne({ _id: req.query.community_id }).exec((err, result) => {
            result.member.push({
                user_id: _id,
                name: req.query.username
            })
            result.save()

            result_user.community.push({
                chat_id: req.query.community_id,
                name: req.query.name
            })
            result_user.save().then((final) => {
                res.send(final)
            })

        })

    })



})



// request parameter
// user_id : owner or group creator _id
// username : ownername
// user_id : owner_id
// {
//     name : 'commmunity name',
//     owner : "_id",
//     description : "about the group"
// }


app.post("/create_community", upload_image.single('avatar'), (req, res) => {

    const create_obj = new community(req.body)
    if (req.file) {
        create_obj.group_icon = req.file.buffer
    }
    create_obj.request = []
    create_obj.member = [{
        user_id: req.query.user_id,
        name: req.query.username
    }]
    create_obj.message = []
    create_obj.save().then((result) => {


        users.findOne({ _id: req.query.user_id }).exec((err, resu) => {
            resu.community.push({
                chat_id: result._id,
                name: result.name
            })
            resu.save()
            res.send({
                result,
                resu
            })
        })
    })


})


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

app.get('/get_community', (req, res) => {
    community.findOne({ _id: req.query.chat_id }).exec(function (err, result) {
        if (err) {
            res.send({ error: "cannot find data" })
        }
        res.send({ name: result.name ,
        result})
    })
})

app.get('/get_community_list', (req, res) => {
    community.find().exec(function (err, result) {
        if (err) {
            res.send({ error: "cannot find data" })
        }
        res.send(result)
    })
})

module.exports = app;