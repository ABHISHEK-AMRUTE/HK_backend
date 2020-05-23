// Require these liberaries, i am pasting the HTML syntax, implement in angular as you do/

// <script src="https://cdnjs.cloudflare.com/ajax/libs/mustache.js/3.0.1/mustache.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.22.2/moment.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/qs/6.6.0/qs.min.js"></script>
// <script src="/socket.io/socket.io.js"></script>


//initializes the socket application.
const socket = io();


// URL type == "URL/some_path?username=name_of_current_user&room=_id_of_chat"
// User credential which we will get from URL of current page where this file is being loaded
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })



/////The real-time connection is beign established, now just like firebase listners we have to add 
// socket.io emmiters and socket.io listners



///fuction which get called everytime when the other user(with whome current user is taking) sends a message.
socket.on('message',(message)=>{
  // Use this function to load each chat bubble in the UI
     
  // you have to use message object to extract name, text_message and timestamp for rendering that in UI
  // structure of the above message object is 
    //  const message = {
        // text : text_message,
        // name : username,
        // timestamp : Date.now()
    // }

    



})





/////call this function on clicking send message button, pass text message as an argument to this function
function send_message(text_message)
{   


     const message = {
         text : text_message,
         name : username,
         timestamp : Date.now()
     }


    socket.emit('sendMessage', message, (error) => {
       

        if (error) {
            //// If you want to do something specific in angular for errors, then handel the errors here.
            return console.log(error)
        }

        console.log('Message delivered!')
    })
}









///this function must not be changed, it connects front-end to backend various socket rooms(currently for one-to-one chats)
socket.emit('join', "one-to-one", { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})
