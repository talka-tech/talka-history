from flask import Blueprint, request, jsonify
from models.user import User, db
from models.conversation import Conversation, Message
import csv
import io

conversation_bp = Blueprint('conversation', __name__)

@conversation_bp.route('/conversations/upload', methods=['POST'])
def upload_conversations():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum ficheiro enviado'}), 400

    file = request.files['file']
    user_id = request.form.get('user_id') 

    if file.filename == '':
        return jsonify({'error': 'Nenhum ficheiro selecionado'}), 400

    if file and user_id:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Utilizador não encontrado'}), 404

        try:
            # Ler e processar o ficheiro CSV
            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
            csv_input = csv.reader(stream)
            header = next(csv_input) # Pular o cabeçalho

            conversations = {}
            for row in csv_input:
                row_data = dict(zip(header, row))
                
                conversation_id = row_data.get("chat_id", "default")
                
                if conversation_id not in conversations:
                    conversations[conversation_id] = {
                        'title': f"Conversa {conversation_id}",
                        'messages': []
                    }
                
                if row_data.get("type") == "text" and row_data.get("text"):
                    fromMe = row_data.get("fromMe") == "1"
                    sender = "Você" if fromMe else row_data.get("mobile_number", "Desconhecido")

                    conversations[conversation_id]['messages'].append({
                        'timestamp': row_data.get("message_created", ""),
                        'sender': sender,
                        'content': row_data.get("text", ""),
                        'fromMe': fromMe
                    })
            
            # Salvar no banco de dados
            for cid, conv_data in conversations.items():
                new_conversation = Conversation(title=conv_data['title'], user_id=user.id)
                db.session.add(new_conversation)
                db.session.flush() # Para obter o ID da conversa

                for msg_data in conv_data['messages']:
                    new_message = Message(
                        timestamp=msg_data['timestamp'],
                        sender=msg_data['sender'],
                        content=msg_data['content'],
                        fromMe=msg_data['fromMe'],
                        conversation_id=new_conversation.id
                    )
                    db.session.add(new_message)
            
            db.session.commit()
            return jsonify({'success': True, 'message': 'Conversas importadas com sucesso!'}), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'Erro no upload'}), 400


@conversation_bp.route('/conversations/<int:user_id>', methods=['GET'])
def get_conversations(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404
        
    conversations = Conversation.query.filter_by(user_id=user_id).all()
    return jsonify([conv.to_dict() for conv in conversations])