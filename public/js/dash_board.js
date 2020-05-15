function printt(room_name){
  console.log('From child')
}

var users = document.getElementById('users')
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })
document.getElementById('display_name').innerHTML = username

fetch('/get_users').then((res)=>{
    res.json().then((data)=>{
         
        data.forEach(element => {
            if(username!=element.name){

           
            
               console.log(element)
              const div =document.createElement('div')
              const span =document.createElement('span')
              span.innerHTML = element.name +"<br>"+element.account_type
              span.setAttribute('style',"margin-top: 2px;margin-bottom: 8px;")
              div.setAttribute('class',"w3-card w3-button w3-block")
              div.append(span)
              var st = "load('"+element.name+"')"
              div.setAttribute('onclick',st)
              users.append(div)

          
            
            
            
            }
        }).catch((err)=>{
          console.log(err)
        });
        
    }) 
   
 })


 function load(room_name){
  console.log('i am here')
document.getElementById('frame').src = "./chat.html?username="+username+"&room="+room_name;
}


