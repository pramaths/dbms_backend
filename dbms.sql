
CREATE TABLE IF NOT EXISTS test_table (
  id INT PRIMARY KEY,
  message VARCHAR(255) NOT NULL
);

-- Students Table
CREATE TABLE Students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number CHAR(10) NOT NULL,
    image_url text,
    github_profile VARCHAR(255),
    Twitter_profile VARCHAR(255),
    image_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Developers Table
CREATE TABLE Developers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number CHAR(10) NOT NULL,
    bio TEXT,
    expertise VARCHAR(255),
    github_profile VARCHAR(255),
    Twitter_profile VARCHAR(255),
    Avg_Prive_perhour VARCHAR(10),
    payments_details VARCHAR(255),
    image_path VARCHAR(255),
    Completed_projects_Count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE Projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('Open', 'Alloted_to_dev', 'Completed') DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES Students(id)
);

-- Proposals Table
CREATE TABLE Proposals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    developer_id INT NOT NULL,
    proposal_text TEXT,
    Estimated_cost INT NOT NULL,
    Estimated_Time VARCHAR(255) NOT NULL,
    status ENUM('Pending', 'Accepted', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES Projects(id),
    FOREIGN KEY (developer_id) REFERENCES Developers(id)
);

-- Reviews Table
CREATE TABLE Reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    project_id INT NOT NULL,
    developer_id INT NOT NULL,
    rating INT NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES Student(id),
    FOREIGN KEY (project_id) REFERENCES Projects(id),
    FOREIGN KEY (developer_id) REFERENCES Developers(id)
);

-- Conversations Table
CREATE TABLE Conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    developer_id INT NOT NULL,
    project_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES Students(id),
    FOREIGN KEY (developer_id) REFERENCES Developers(id),
    FOREIGN KEY (project_id) REFERENCES Projects(id)
);

-- Messages Table
CREATE TABLE Messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,  -- Note: You might need to manage sender type (Student/Developer) if needed
    message_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES Conversations(id)
);

-- Docs Table
CREATE TABLE Docs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

CREATE TABLE ProjectDocs (
    project_id INT NOT NULL,
    doc_id INT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES Projects(id),
    FOREIGN KEY (doc_id) REFERENCES Docs(id),
    PRIMARY KEY (project_id, doc_id)
);

ALTER TABLE Students
ADD COLUMN verification_token VARCHAR(255),
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN reset_password_token VARCHAR(255),
ADD COLUMN reset_password_expires DATETIME;

ALTER TABLE Developers
ADD COLUMN verification_token VARCHAR(255),
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN reset_password_token VARCHAR(255),
ADD COLUMN reset_password_expires DATETIME;

ALTER TABLE Projects
ADD COLUMN requirements TEXT,
ADD COLUMN deadline DATETIME;
