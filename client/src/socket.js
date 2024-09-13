import {io} from 'socket.io-client';
const url = '192.168.1.6:9000'


export const socket = io(url, {autoConnect: false});
