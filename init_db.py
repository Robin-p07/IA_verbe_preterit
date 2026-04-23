import pymysql
import json
import os
import sys
from werkzeug.security import generate_password_hash

def init_db():
    print("Connecting to MySQL...")
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='secret'
    )
    
    try:
        with connection.cursor() as cursor:
            # Create database if not exists
            cursor.execute("CREATE DATABASE IF NOT EXISTS smartverbs_db")
            cursor.execute("USE smartverbs_db")
            
            # Create users table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                stats_json TEXT
            )
            """)
            
            # Create verbs table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS verbs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fr VARCHAR(100) UNIQUE NOT NULL,
                base VARCHAR(100) NOT NULL,
                past VARCHAR(100) NOT NULL,
                participle VARCHAR(100) NOT NULL,
                past_alt VARCHAR(100) DEFAULT NULL,
                participle_alt VARCHAR(100) DEFAULT NULL
            )
            """)

            # 1. Create root user if not exists
            cursor.execute("SELECT id FROM users WHERE username = 'root'")
            if not cursor.fetchone():
                hashed_pw = generate_password_hash('1234')
                cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", ('root', hashed_pw))
                print("Root user created.")
            
            # 2. Migrate data from static/data.js if verbs table is empty
            cursor.execute("SELECT COUNT(*) as count FROM verbs")
            count = cursor.fetchone()[0]
            
            if count == 0:
                print("Migrating verbs from data.js...")
                data_file = os.path.join(os.path.dirname(__file__), 'static', 'data.js')
                if os.path.exists(data_file):
                    with open(data_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Extract JSON part
                        json_str = content[content.find('['):content.rfind(']')+1]
                        
                        # Handle potential unquoted keys in data.js
                        import re
                        json_str = re.sub(r'([{,]\s*)([a-zA-Z0-9_]+)(\s*:)', r'\1"\2"\3', json_str)
                        
                        try:
                            verbs = json.loads(json_str)
                            for v in verbs:
                                cursor.execute("""
                                    INSERT INTO verbs (fr, base, past, participle, past_alt, participle_alt) 
                                    VALUES (%s, %s, %s, %s, %s, %s)
                                """, (
                                    v.get('fr'), v.get('base'), v.get('past'), v.get('participle'),
                                    v.get('pastAlt', None), v.get('participleAlt', None)
                                ))
                            print(f"{len(verbs)} verbs migrated successfully.")
                        except json.JSONDecodeError as e:
                            print(f"Error parsing data.js: {e}")
                else:
                    print("static/data.js not found, skipping migration.")
            else:
                print("Verbs table already populated.")
            
        connection.commit()
        print("Initialization complete.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        connection.close()

if __name__ == '__main__':
    init_db()
