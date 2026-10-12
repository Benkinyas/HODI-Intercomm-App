-- HODI Enterprise Staff Alert & Intercom System Schema

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  can_alert_all BOOLEAN DEFAULT FALSE,
  can_alert_dept BOOLEAN DEFAULT FALSE,
  can_manage_system BOOLEAN DEFAULT FALSE
);

INSERT INTO roles (id, name, can_alert_all, can_alert_dept, can_manage_system) VALUES
('super_admin', 'Super Admin', TRUE, TRUE, TRUE),
('ceo', 'CEO / Executive', TRUE, TRUE, FALSE),
('hod', 'Department Manager (HOD)', FALSE, TRUE, FALSE),
('staff', 'Normal Staff', FALSE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  hod_user_id VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  role_id VARCHAR(32) NOT NULL DEFAULT 'staff',
  department_id VARCHAR(64),
  phone VARCHAR(32) NOT NULL,
  photo_url VARCHAR(255),
  status ENUM('online', 'recently_active', 'offline') DEFAULT 'online',
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  platform ENUM('android', 'ios', 'web') NOT NULL,
  push_token TEXT NOT NULL,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(64) PRIMARY KEY,
  sender_id VARCHAR(64) NOT NULL,
  sender_name VARCHAR(128) NOT NULL,
  sender_role VARCHAR(64) NOT NULL,
  location VARCHAR(128) NOT NULL DEFAULT "CEO's Office",
  priority ENUM('normal', 'important', 'urgent') NOT NULL DEFAULT 'urgent',
  reason TEXT,
  target_type ENUM('single', 'multi', 'department', 'all_staff') NOT NULL,
  target_id VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS alert_recipients (
  id VARCHAR(64) PRIMARY KEY,
  alert_id VARCHAR(64) NOT NULL,
  recipient_id VARCHAR(64) NOT NULL,
  status ENUM('sent', 'delivered', 'acknowledged', 'escalated', 'withdrawn') DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP NULL,
  acknowledged_at TIMESTAMP NULL,
  response_type ENUM('on_my_way', 'acknowledged', 'cant_come_now') NULL,
  cant_come_reason VARCHAR(255) NULL,
  response_time_seconds INT NULL,
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS alert_escalations (
  id VARCHAR(64) PRIMARY KEY,
  alert_id VARCHAR(64) NOT NULL,
  original_recipient_id VARCHAR(64) NOT NULL,
  manager_id VARCHAR(64) NOT NULL,
  escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'resolved') DEFAULT 'pending',
  FOREIGN KEY (alert_id) REFERENCES alerts(id)
);
