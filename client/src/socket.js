import {io} from 'socket.io-client';
const url = 'localhost:9000'


export const socket = io(url, {autoConnect: false});
