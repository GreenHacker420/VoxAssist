-- VoxAssist Database Schema
-- MySQL database schema for AI Voice Support Agent

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Organizations table (for multi-tenant support)
CREATE TABLE organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User organization mapping
CREATE TABLE user_organizations (
    user_id INT,
    organization_id INT,
    role VARCHAR(50) DEFAULT 'member',
    PRIMARY KEY (user_id, organization_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Calls table
CREATE TABLE calls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    call_sid VARCHAR(255) UNIQUE NOT NULL,
    organization_id INT,
    customer_phone VARCHAR(20) NOT NULL,
    twilio_phone VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'initiated',
    duration INT DEFAULT 0,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    recording_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Call interactions (conversation turns)
CREATE TABLE call_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    call_id INT,
    sequence_number INT NOT NULL,
    speaker VARCHAR(20) NOT NULL, -- 'customer' or 'ai'
    content TEXT NOT NULL,
    audio_url TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ai_confidence DECIMAL(3,2),
    intent VARCHAR(100),
    sentiment VARCHAR(20),
    sentiment_score DECIMAL(3,2),
    FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

-- Knowledge base for AI responses
CREATE TABLE knowledge_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT,
    category VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords JSON,
    priority INT DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Escalation rules
CREATE TABLE escalation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT,
    name VARCHAR(255) NOT NULL,
    conditions JSON NOT NULL,
    action VARCHAR(100) NOT NULL,
    priority INT DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Analytics aggregations
CREATE TABLE daily_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT,
    date DATE NOT NULL,
    total_calls INT DEFAULT 0,
    resolved_calls INT DEFAULT 0,
    escalated_calls INT DEFAULT 0,
    avg_duration DECIMAL(8,2) DEFAULT 0,
    avg_sentiment DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_org_date (organization_id, date),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Voice settings
CREATE TABLE voice_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT,
    voice_id VARCHAR(255) NOT NULL,
    voice_name VARCHAR(255) NOT NULL,
    stability DECIMAL(3,2) DEFAULT 0.5,
    similarity_boost DECIMAL(3,2) DEFAULT 0.5,
    style DECIMAL(3,2) DEFAULT 0.0,
    use_speaker_boost BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Indexes for performance
CREATE INDEX idx_calls_organization_id ON calls(organization_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_start_time ON calls(start_time);
CREATE INDEX idx_call_interactions_call_id ON call_interactions(call_id);
CREATE INDEX idx_call_interactions_timestamp ON call_interactions(timestamp);
CREATE INDEX idx_knowledge_base_organization_id ON knowledge_base(organization_id);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_daily_analytics_organization_date ON daily_analytics(organization_id, date);

-- Sample data
INSERT INTO organizations (name, domain) VALUES 
('VoxAssist Demo', 'demo.voxassist.com'),
('Acme Corporation', 'acme.com');

INSERT INTO users (email, password_hash, name, role) VALUES 
('admin@voxassist.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin'),
('demo@voxassist.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo User', 'user');

INSERT INTO user_organizations (user_id, organization_id, role) VALUES 
(1, 1, 'admin'),
(2, 1, 'member');

INSERT INTO knowledge_base (organization_id, category, question, answer, keywords) VALUES 
(1, 'billing', 'How do I view my bill?', 'You can view your bill by logging into your account and navigating to the Billing section. Your current and past bills will be displayed there.', JSON_ARRAY('bill', 'billing', 'invoice', 'payment')),
(1, 'technical', 'My service is not working', 'I understand you''re experiencing service issues. Let me help you troubleshoot. First, please try restarting your device and checking your internet connection.', JSON_ARRAY('not working', 'broken', 'issue', 'problem')),
(1, 'account', 'How do I reset my password?', 'To reset your password, go to the login page and click "Forgot Password". Enter your email address and you''ll receive a reset link.', JSON_ARRAY('password', 'reset', 'login', 'forgot'));

INSERT INTO voice_settings (organization_id, voice_id, voice_name) VALUES 
(1, 'pNInz6obpgDQGcFmaJgB', 'Adam - Professional Male Voice');
