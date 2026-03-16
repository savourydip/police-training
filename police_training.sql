-- Police Training System Database Table
-- This table is automatically created by the script on first start
-- Only run this manually if you encounter issues

CREATE TABLE IF NOT EXISTS `police_training` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `citizen_id` VARCHAR(50) NOT NULL,
    `player_name` VARCHAR(100) NOT NULL,
    `fto_name` VARCHAR(100) NOT NULL,
    `fto_citizen_id` VARCHAR(50) NOT NULL,
    `training_data` LONGTEXT NOT NULL,
    `comments` LONGTEXT DEFAULT NULL,
    `exam_score` INT DEFAULT NULL,
    `exam_passed` TINYINT(1) DEFAULT 0,
    `completed` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_cadet` (`citizen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
