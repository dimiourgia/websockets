const http = require('http');
const express = require('express');
const path = require('path');
const { Server } = require('socket.io')
const cors = require('cors');

const app = express();
app.use(cors);

app.use(express.static(path.resolve('./public')));
// app.get('/', (req, res)=>{
//     res.sendFile('/public/index.html')
// })
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ['GET', 'POST'],
    }
});

const users = [];
const messages = {};
const rooms = [];
const maxWaitTime = 300; //in seconds
const questions = [
    {
        countryCode: 'in',
        totalLetters: 5,
        hind: 'I-N--A',
        ans: 'INDIA',
    }
]

io.on('connection', (socket)=>{
    console.log('new user connection requested..', socket.id)

    socket.on('join-room', (message)=>{
        console.log(message, 'message on joing room')
        const {username, roomName} = message;
        //expected.. username, roomId
        const user = {
            username,
            socketId:socket.id
        }

    
        //join an existing room with less than 10 connections that is about to start
        let existingRoom = null;

        for(let i=0; i<rooms.length; i++){
            if(rooms[i].users.length < 10 && !rooms[i].gameStarted){
                existingRoom = rooms[i];
                break;
            }
        }

        if(existingRoom){
            //a room is found.. let the user join this room
            existingRoom.users.push(user);
            if(existingRoom.users.length == 2){
                existingRoom.countStartedAt = new Date();
                existingRoom.startsIn = maxWaitTime; //2 minutes wait before starting the game
            }else{
                const diff = maxWaitTime - Math.floor(Math.abs(new Date() - existingRoom.countStartedAt)/1000);
                existingRoom.startsIn = diff;
            }
            
            
            socket.join(existingRoom.roomName);
            socket.emit('joined', existingRoom);
            //broadcast room changes to all users
            io.in(existingRoom.roomName).emit('room-update', existingRoom);
        }else{
             //no exisiting room is there create a random one and bind the user to it
             const roomName = `${username}'s_room`;
             const room = {
                 roomName,
                 users: [user],
                 startsIn:null,
                 gameStarted: false,
                 messages: [],
             }
             rooms.push(room);
             socket.join(roomName);
             socket.emit('joined', room);
        }

        const interval = setInterval(()=>{
            //check if a room need to start the game
            rooms.forEach(room=>{
                diff = maxWaitTime-Math.floor(Math.abs(new Date() - room.countStartedAt)/1000);
                if(!room.gameStarted && diff <= 1){
                    room.gameStarted = true;
                    startQuestionInterval();
                    room.startsIn = 0;
                    io.in(room.roomName).emit('room-update', room);
                    clearInterval(interval);
                }
            })
        },1000);

        function startQuestionInterval(){
            const interval = setInterval(()=>{
                
            },10000)
        }


        
    });

    socket.on('user-message', ({content, to, sender})=>{
        console.log(`message from ${sender}, content: ${content}, roomName: ${to}`);
        let room = rooms.find(room=>room.roomName == to);
        if(room){
            console.log(room, 'room');
            room.messages.push({sender, message:content, timeStamp:new Date()});
            console.log(room, 'room after pushing message', room.roomName);
            const res = io.in(room.roomName).emit('message-update', room.messages);
            console.log(res, 'res... ')
        }else{
            socket.emit('message-error', {type:'RoomNotFound', message: `can not find the given roomname, ${to}`})
        }
       
    })

    socket.on('disconnect', ()=>{
        //check users list for all rooms and remove user from there
        for(let i=0; i<rooms.length; i++){
            for(let j=0; j<rooms[i].users.length; j++){
                if(rooms[i].users[j].socketId == socket.id){
                    //remove user from the room... send room update to all connected members
                    rooms[i].users = rooms[i].users.filter(user=>user.socketId != socket.id);
                    io.in(rooms[i].roomName).emit('room-update', rooms[i]);
                    break;
                }
            }
        }
    })
})



//handle room creation


server.listen(9000, ()=>{console.log('listening on port 9000')});

/*
what is expeced in connection request
username,
roomId,-> can be null

 */