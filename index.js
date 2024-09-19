const http = require('http');
const express = require('express');
const path = require('path');
const { Server } = require('socket.io')
const cors = require('cors');
const { timeStamp } = require('console');

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
const maxWaitTime = 10; //in seconds

const questions = [
    {
        countryCode: 'in',
        totalLetters: 5,
        hint: 'I-N--A',
        ans: 'INDIA',
        maxTime:10,
        id:0,
        timedOut: false,
        userAnswers: [],
    },
    {
        countryCode: 'us',
        totalLetters: 6,
        hint: 'U--T-D',
        ans: 'UNITED',
        maxTime:10,
        id:1,
        timedOut: false,
        userAnswers: [],
    },
    {
        countryCode: 'uk',
        totalLetters: 7,
        hint: 'E-G-A-D',
        ans: 'ENGLAND',
        maxTime:10,
        id:2,
        timedOut: false,
        userAnswers: [],
    },
    {
        countryCode: 'ca',
        totalLetters: 6,
        hint: 'C-N-D-',
        ans: 'CANADA',
        maxTime:10,
        id:3,
        timedOut: false,
        userAnswers: [],
    },
    {
        countryCode: 'au',
        totalLetters: 9,
        hint: 'A-S-R-L-A',
        ans: 'AUSTRALIA',
        maxTime:10,
        id:4,
        timedOut: false,
        userAnswers: [],
    },
    {
        countryCode: 'fr',
        totalLetters: 6,
        hint: 'F-A-C-',
        ans: 'FRANCE',
        maxTime:10,
        id:5,
        timedOut: false,
        userAnswers: [],
    },
    {
        countryCode: 'de',
        totalLetters: 7,
        hint: 'G-R-A-Y',
        ans: 'GERMANY',
        maxTime:10,
        id:6,
        timedOut: false,
        userAnswers: [],
    },
    {
        countryCode: 'jp',
        totalLetters: 5,
        hint: 'J-P-N-',
        ans: 'JAPAN',
        maxTime:10,
        id:7,
        timedOut: false,
        userAnswers: [],
    },
    {
        countryCode: 'it',
        totalLetters: 5,
        hint: 'I-A-Y',
        ans: 'ITALY',
        maxTime:10,
        id:8,
        timedOut: false,
        userAnswers: [],
    },
    {
        countryCode: 'br',
        totalLetters: 6,
        hint: 'B-A-I-',
        ans: 'BRAZIL',
        maxTime:10,
        id:9,
        timedOut: false,
        userAnswers: [],
    }
];
const results = [];


io.on('connection', (socket)=>{
    console.log('new user connection requested..', socket.id)

    socket.on('join-room', (message)=>{
        console.log(message, 'message on joing room')
        const {username, roomName} = message;
        //expected.. username, roomId
        const user = {
            username,
            socketId:socket.id,
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
                 question:{},
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
                    startQuestionInterval(room.roomName);
                    room.startsIn = 0;
                    io.in(room.roomName).emit('room-update', room);
                }
            })
        },1000);


        function startQuestionInterval(roomName){
            const room = rooms.find(r=>r.roomName == roomName);

            console.log('room name.. is', roomName, JSON.stringify(room));
            room.question = questions[0];
            io.in(roomName).emit('question-update', questions[0]);

            const interval = setInterval(()=>{
                let lastQuestion = room?.question;
                if(lastQuestion && lastQuestion.id < 9){
                    room.question = questions[lastQuestion.id+1];
                    io.in(roomName).emit('question-update', questions[lastQuestion.id+1]);
                }

                if(lastQuestion && lastQuestion.id == 9){
                    io.in(roomName).emit('game-end');
                    clearInterval(interval);
                }
                
            },10000);
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

    socket.on('ans-update', ({ ans, questionId, socketId, roomName }) => {
        // Find the room by roomName
        let room = rooms.find(r => r.roomName == roomName);
        if (!room) return;
    
        // Find the user by socketId in the room
        let userIndex = room.users.findIndex(usr => usr.socketId == socketId);
        if (userIndex === -1) return;
    
        let question = questions[questionId];
    
        // Check if the answer is correct
        if (question.ans.toLowerCase() == ans.toLowerCase()) {
            // Check if the user has already answered
            if (!question.userAnswers.find(answer => answer.username === room.users[userIndex].username)) {
                // Update the user's score and answer
                let scoreToAdd;
                if (question.userAnswers.length === 0) {
                    scoreToAdd = 100;
                } else if (question.userAnswers.length === 1) {
                    scoreToAdd = 70;
                } else if (question.userAnswers.length === 2) {
                    scoreToAdd = 50;
                }
    
                room.users[userIndex].score = (room.users[userIndex].score ?? 0) + scoreToAdd;
                room.users[userIndex].answers = [...(room.users[userIndex].answers ?? []), { questionId, ans, timeStamp: new Date() }];
                
                // Add to question's userAnswers
                question.userAnswers.push({ username: room.users[userIndex].username, ans });
    
                // Broadcast the updated users to the room
                io.in(roomName).emit('user-update', { users: room.users });
            }
        }
    });
    

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