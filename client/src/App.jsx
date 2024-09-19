import { useEffect, useRef, useState } from 'react'
import { socket } from './socket';

import './App.css'

const sampleRoom = {
  roomName: 'room1',
  users: [
    {username: 'Ajay Singh', socketId: '124544', score: 0, answers: [{questionId: 0, answer:'India', timeStamp:'100'}]},
    {username: 'Aaman Singh', socketId: '124844', score: 0, answers: [{questionId: 0, answer:'India', timeStamp: '150'}]},
  ],
  gameStarted: true,
  startsIn: 300,
  messages: [
    {sender: 'aman', message:'Hi'},
    {sender: 'ajay', message: 'Hi There'},
    {sender: 'abhi', message: 'kab start hoga'}
  ],
  question: {
    countryCode: 'in',
    totalLetters: 5,
    hint: 'I-D--',
    maxTime: 1000,
    questionId: 0,
  }
}

function App() {
  const [count, setCount] = useState(0)
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState(sampleRoom);
  const [message, setMessage] = useState('');

  const [timer, setTimer] = useState(null);
  const messageInputRef = useRef(null);
  const ansRef = useRef(null);

  useEffect(()=>{
    return ()=>socket.close();
  },[]);


  const createConnection = ()=>{
    if(username == ''){
      alert('Plase provide a username');
      return;
    }
    socket.connect();
    socket.emit('join-room', {username})
    socket.on('joined', ({roomName, startsIn, users, gameStarted, messages})=>{
      setRoom({roomName, startsIn, users, gameStarted, messages});
    })
    socket.on('room-update', ({roomName, startsIn, users, gameStarted, messages})=>{
      setRoom({roomName, startsIn, users, gameStarted, messages});
    })
    socket.on('message-update', (message)=>{
      setRoom(pre=>({...pre, messages:message}));
    })
    socket.on('question-update', (message)=>{
      setRoom(pre=>({...pre, question:message}))
    } );
  }

  useEffect(()=>{
    console.log(room?.messages, 'messages')
  },[room?.messages])

  const sendMessage = ()=>{
    if(message == ''){
      alert('Please write your message');
      return;
    }
    socket.emit('user-message', {content:message, to:room.roomName, sender: username });
    if(messageInputRef.current){
      messageInputRef.current.value = '';
      messageInputRef.current.focus();
    }
  }

  const handleKeydown = (e)=>{
    console.log('handling key down')
    if(e.code == 'Enter'){
      console.log(ansRef.current.value)
      socket.emit('ans-update', {ans: ansRef.current.value} )
    }
  }

  return (
    <>
      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
        <h1>Country Game</h1>
        <span className='flag flag-in'/>
      </div>
      {/* create room section */}
      {room == null && <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
        <div style={{display: 'flex', flexDirection:'column', gap:'4px', placeItems:'flex-start'}}>
          <label htmlFor='username'>Username</label>
          <input type='text' id='username' style={{width: '400px', height:'40px', paddingInline:'5px', fontSize:'17px', }} onChange={(e)=>setUsername(e.target.value)}/>
        </div>
        <button onClick={createConnection}>
         Join
        </button>
      </div>}

      {/* waiting looby */}
      {room && !room?.gameStarted && <div style={{minWidth:'400px', minHeight:'200px', border: '1px solid #ababab', borderRadius:'4px', paddingInline:'25px'}}>
        {room?.users.length < 2 && <h3>Waiting for other to join..</h3>}
        {room?.users.length > 1 && <div>
          <Timer startsIn={room.startsIn}/>
          <div style={{display:'flex', flexDirection:'row', gap:'50px'}}>
            {/* waiting user details */}
            <div style={{width: '300px'}}>
              <h4 style={{top: '50px'}}>{`Joined Users: (${room.users.length})`}</h4>
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}>
                {room?.users.map(user=><span style={{}}>{user.username}</span>)}           
              </div>
            </div>
            {/* message section */}
            <div style={{width: '300px'}}>
              <h4>Messages</h4>
              {/* container for messages */}
              <div style={{display: 'flex', flexDirection:'column', alignContent:'flex-start', gap:'10px'}}>
                {/* sent and received messages */}
                <div style={{display:'flex', flexDirection:'column', paddingLeft:'10px', gap:'10px', overflowY:'scroll', border:'1px solid lightgrey'}}>
                  {room?.messages.map(message=>(<div style={{display:'flex', width:'fit-content', placeContent:'flex-start', gap:'10px'}}>
                        <div style={{fontSize: '14px', display: 'flex', width: 'fit-content' ,flexDirection:'column', alignItems:'flex-start', placeContent:'flex-start', gap:'-2px'}}>
                          <span style={{fontSize:'14px', color:'darkgrey'}}>{message.sender}</span>
                          <span>{message.message}</span>
                        </div>
                      </div>))}
                </div>
                {/* input and submit buuton to send messages */}
                <div style={{minHeight: '100px', display:'flex', flexDirection:'column', gap:'10px'}}>
                  <textarea ref={messageInputRef} style={{minHeight:'50px'}} placeholder='Write your message...' id='textarea' onChange={(e)=>setMessage(e.target.value)}/>
                  <button onClick={sendMessage}>Send Message</button>
                </div>
              </div>
            </div>
          </div>
          </div>}
      </div>}
      {room && room?.gameStarted && <div style={{width:'400px', minHeight:'500px'}}>
        Game Started 
        {/* questions section */}
        {room?.question && <div>
          <QuestionTimer timeLeft={room?.question?.maxTime} />
          <span className={`flag flag-${room?.question?.countryCode}`} />
          <p>{room?.question?.hint}</p>
          <input ref={ansRef} style={{height:'30px', fontSize:'15px'}} onKeyDown={handleKeydown} />
        </div> }
        {/* chat section */}
        <div>

        </div>

        </div>}

      
    </>
  )
}


const Timer = ({ startsIn }) => {
  const [timer, setTimer] = useState(startsIn);

  useEffect(() => {
    setTimer(startsIn);
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [startsIn]);

  return <h3>Game starts in {timer}</h3>;
};

const QuestionTimer = ({timeLeft})=>{
  const [timer, setTimer] = useState(timeLeft);

  useEffect(() => {
    setTimer(timeLeft);
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  return <h3>{timer}</h3>;
}


export default App
