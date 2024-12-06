
import { Injectable } from '@angular/core';
import { Stomp } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { modelMessage} from '../models/modelMessage';
import { BehaviorSubject } from 'rxjs';
import { encrypt } from 'src/app/util/util-encrypt';
import { environment } from 'src/app/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private stompClient: any;  // Variable que mantiene la conexión del cliente STOMP.
  private messageSubject: BehaviorSubject<modelMessage[]> = new BehaviorSubject<modelMessage[]>([]);  // Comportamiento de flujo de mensajes, inicializado con un array vacío.

  constructor() {
    this.initConnectionSocket();  // Llama al método para inicializar la conexión al socket.
  }

  // Método para iniciar la conexión con el servidor WebSocket.
  initConnectionSocket(): void {
    const url = '/chat-socket';  // Define la URL del servidor WebSocket.
    
    // Crea la instancia de la conexión usando SockJS.
    const socket = new SockJS(url);
    
    // Usa STOMP sobre la conexión SockJS para establecer comunicación WebSocket.
    this.stompClient = Stomp.over(socket);
  }

  // Método para unirse a una sala de chat especificada por 'salaId'.
  ingresarSala(salaId: string): void {
    this.stompClient.connect({}, () => {
      // Suscribirse al canal del servidor antes de pedir mensajes pendientes.
      this.stompClient.subscribe(`/topic/${salaId}`, (messages: any) => {
        const messageContent = JSON.parse(messages.body); // Parsear mensaje recibido.
        const currentMessage = this.messageSubject.getValue(); // Obtener mensajes actuales.
        currentMessage.push(messageContent); // Añadir el nuevo mensaje.
        this.messageSubject.next(currentMessage); // Actualizar el flujo de mensajes.
        localStorage.setItem('chatMessages', JSON.stringify(currentMessage)); // Guardar mensajes en localStorage.
      });

      // Solicitar mensajes pendientes de la sala después de reconectar.
      this.stompClient.send(`/app/chat/reconnect/${salaId}`, {}, {});
    });
  }

  // Método para enviar un mensaje a una sala de chat.
  enviarSmsEncrypt(salaId: string, chatMessage: modelMessage): void {

    console.log(encrypt(chatMessage.message));  // Imprime el mensaje encriptado (para depuración).

    // Si la encriptación está habilitada en el entorno, encripta el mensaje.
    if (environment.encrypt) {
      chatMessage.message = encrypt(chatMessage.message);  // Encripta el mensaje antes de enviarlo.
    }

    // Envía el mensaje al servidor WebSocket a través del canal de la sala.
    this.stompClient.send(`/app/chat/${salaId}`, {}, JSON.stringify(chatMessage));
  }

  // Método para obtener el flujo de mensajes como un Observable.
  getMessageSubject() {
    return this.messageSubject.asObservable(); 
  }

  // Método para desconectar la sesión del WebSocket.
  disconnect() {
    this.stompClient.disconnect();  // Llama al método para desconectar la sesión WebSocket.
  }
}