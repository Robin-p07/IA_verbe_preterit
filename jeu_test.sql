CREATE DATABASE IF NOT EXISTS smartverbs_db;
USE smartverbs_db;

-- Création de la table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    stats_json TEXT
);

-- Création de la table des verbes irréguliers
CREATE TABLE IF NOT EXISTS verbs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fr VARCHAR(100) UNIQUE NOT NULL,
    base VARCHAR(100) NOT NULL,
    past VARCHAR(100) NOT NULL,
    participle VARCHAR(100) NOT NULL,
    past_alt VARCHAR(100) DEFAULT NULL,
    participle_alt VARCHAR(100) DEFAULT NULL
);
