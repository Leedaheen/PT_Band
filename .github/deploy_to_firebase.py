import firebase_admin
from firebase_admin import credentials, db
import os

# Firebase 인증서 경로를 환경변수에서 가져오기
cred = credentials.Certificate(os.getenv('HOME') + '/firebase-service-account.json')

# Firebase 앱 초기화
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://your-firebase-database-url.firebaseio.com'  # Firebase Realtime DB URL
})

# Firebase 데이터베이스에 데이터 추가 예시
ref = db.reference('jobs')
ref.set({
    'job1': {
        'team': 'Band X',
        'location': 'Seoul',
        'type': '구인',
        'age': 25
    }
})

print("Firebase에 데이터가 성공적으로 추가되었습니다.")
