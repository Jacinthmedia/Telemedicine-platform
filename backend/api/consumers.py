import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()


class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'video_{self.room_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            return
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'signal_message', 'message': data, 'sender_channel': self.channel_name}
        )

    async def signal_message(self, event):
        if self.channel_name != event['sender_channel']:
            await self.send(text_data=json.dumps(event['message']))


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return
        self.group_name = f'chat_user_{self.user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            return

        action = data.get('action', 'message')
        
        if action == 'typing':
            receiver_id = data.get('receiver')
            if receiver_id:
                await self.channel_layer.group_send(
                    f'chat_user_{receiver_id}',
                    {'type': 'typing_event', 'sender': self.user.id, 'is_typing': data.get('is_typing', False)}
                )
            return

        receiver_id = data.get('receiver')
        message = (data.get('message') or '').strip()

        if not receiver_id or not message:
            return

        msg = await self.save_message(receiver_id, message)
        payload = {
            'id': msg['id'],
            'sender': self.user.id,
            'receiver': int(receiver_id),
            'message': message,
            'created_at': msg['created_at'],
        }

        # Send to receiver and echo back to sender
        await self.channel_layer.group_send(f'chat_user_{receiver_id}', {'type': 'chat_message', 'payload': payload})
        await self.channel_layer.group_send(f'chat_user_{self.user.id}', {'type': 'chat_message', 'payload': payload})

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['payload']))

    async def typing_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'sender': event['sender'],
            'is_typing': event['is_typing']
        }))

    @database_sync_to_async
    def save_message(self, receiver_id, text):
        from api.models import ChatMessage
        receiver = User.objects.get(id=receiver_id)
        msg = ChatMessage.objects.create(sender=self.user, receiver=receiver, message=text)
        return {'id': msg.id, 'created_at': msg.created_at.isoformat()}
