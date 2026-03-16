local QBCore = exports['qb-core']:GetCoreObject()

-- Create database table on resource start
CreateThread(function()
    MySQL.query([[
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
        )
    ]])
    print("^2[Police Training]^7 Database table initialized")
end)

-- Helper function to check if player is FTO
local function IsFTO(source)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then return false end
    
    if Player.PlayerData.job.name ~= Config.PoliceJob then
        return false
    end
    
    for _, grade in ipairs(Config.FTOGrades) do
        if Player.PlayerData.job.grade.level == grade then
            return true
        end
    end
    
    return false
end

-- Get all training records
QBCore.Functions.CreateCallback('police:training:getAll', function(source, cb)
    if not IsFTO(source) then
        cb(nil)
        return
    end
    
    local result = MySQL.query.await('SELECT * FROM police_training ORDER BY created_at DESC')
    cb(result)
end)

-- Get specific cadet training record
QBCore.Functions.CreateCallback('police:training:getCadet', function(source, cb, citizenId)
    if not IsFTO(source) then
        cb(nil)
        return
    end
    
    local result = MySQL.query.await('SELECT * FROM police_training WHERE citizen_id = ?', {citizenId})
    if result and result[1] then
        cb(result[1])
    else
        cb(nil)
    end
end)

-- Add new cadet to training
RegisterNetEvent('police:training:addCadet', function(data)
    local src = source
    if not IsFTO(src) then return end
    
    local Player = QBCore.Functions.GetPlayer(src)
    local targetPlayer = QBCore.Functions.GetPlayerByCitizenId(data.citizenId)
    
    if not targetPlayer then
        TriggerClientEvent('QBCore:Notify', src, 'Cadet not found in the city', 'error')
        return
    end
    
    -- Check if cadet already exists
    local existing = MySQL.query.await('SELECT id FROM police_training WHERE citizen_id = ?', {data.citizenId})
    
    if existing and existing[1] then
        TriggerClientEvent('QBCore:Notify', src, 'This cadet is already in the training system', 'error')
        return
    end
    
    local initialData = {
        phases = {}
    }
    
    for i, phase in ipairs(Config.TrainingPhases) do
        initialData.phases[i] = {
            name = phase.name,
            sections = {}
        }
        for _, section in ipairs(phase.sections) do
            initialData.phases[i].sections[section.id] = {
                completed = false,
                callsign = "",
                timestamp = nil
            }
        end
    end
    
    MySQL.insert('INSERT INTO police_training (citizen_id, player_name, fto_name, fto_citizen_id, training_data) VALUES (?, ?, ?, ?, ?)', {
        data.citizenId,
        targetPlayer.PlayerData.charinfo.firstname .. " " .. targetPlayer.PlayerData.charinfo.lastname,
        Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname,
        Player.PlayerData.citizenid,
        json.encode(initialData)
    })
    
    TriggerClientEvent('QBCore:Notify', src, 'Cadet added to training system', 'success')
    TriggerClientEvent('police:training:refresh', src)
end)

-- Update training progress
RegisterNetEvent('police:training:updateProgress', function(citizenId, trainingData)
    local src = source
    if not IsFTO(src) then return end
    
    MySQL.update('UPDATE police_training SET training_data = ? WHERE citizen_id = ?', {
        json.encode(trainingData),
        citizenId
    })
    
    TriggerClientEvent('QBCore:Notify', src, 'Training progress updated', 'success')
end)

-- Add/Update FTO comment
RegisterNetEvent('police:training:updateComment', function(citizenId, comment)
    local src = source
    if not IsFTO(src) then return end
    
    local Player = QBCore.Functions.GetPlayer(src)
    local timestamp = os.date("%Y-%m-%d %H:%M:%S")
    local ftoName = Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname
    
    -- Get existing comments
    local result = MySQL.query.await('SELECT comments FROM police_training WHERE citizen_id = ?', {citizenId})
    
    local comments = {}
    if result and result[1] and result[1].comments then
        comments = json.decode(result[1].comments) or {}
    end
    
    table.insert(comments, {
        fto = ftoName,
        comment = comment,
        timestamp = timestamp
    })
    
    MySQL.update('UPDATE police_training SET comments = ? WHERE citizen_id = ?', {
        json.encode(comments),
        citizenId
    })
    
    TriggerClientEvent('QBCore:Notify', src, 'Comment added successfully', 'success')
end)

-- Submit exam results
RegisterNetEvent('police:training:submitExam', function(citizenId, score, passed)
    local src = source
    
    MySQL.update('UPDATE police_training SET exam_score = ?, exam_passed = ? WHERE citizen_id = ?', {
        score,
        passed and 1 or 0,
        citizenId
    })
    
    if passed then
        TriggerClientEvent('QBCore:Notify', src, 'Congratulations! You passed the exam with ' .. score .. '%', 'success')
    else
        TriggerClientEvent('QBCore:Notify', src, 'You scored ' .. score .. '%. You need ' .. Config.ExamPassingScore .. '% to pass. Please try again.', 'error')
    end
end)

-- Mark training as completed
RegisterNetEvent('police:training:complete', function(citizenId)
    local src = source
    if not IsFTO(src) then return end
    
    MySQL.update('UPDATE police_training SET completed = 1 WHERE citizen_id = ?', {citizenId})
    
    TriggerClientEvent('QBCore:Notify', src, 'Training marked as completed', 'success')
    TriggerClientEvent('police:training:refresh', src)
end)

-- Delete training record
RegisterNetEvent('police:training:delete', function(citizenId)
    local src = source
    if not IsFTO(src) then return end
    
    MySQL.query('DELETE FROM police_training WHERE citizen_id = ?', {citizenId})
    
    TriggerClientEvent('QBCore:Notify', src, 'Training record deleted', 'success')
    TriggerClientEvent('police:training:refresh', src)
end)

-- Get player's own training record (for cadets)
QBCore.Functions.CreateCallback('police:training:getMyTraining', function(source, cb)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then
        cb(nil)
        return
    end
    
    local result = MySQL.query.await('SELECT * FROM police_training WHERE citizen_id = ?', {Player.PlayerData.citizenid})
    if result and result[1] then
        cb(result[1])
    else
        cb(nil)
    end
end)
