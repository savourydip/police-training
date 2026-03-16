local QBCore = exports['qb-core']:GetCoreObject()
local isTrainingOpen = false

-- Create ox_target zones for training computers
CreateThread(function()
    for _, coords in ipairs(Config.ComputerLocations) do
        exports.ox_target:addBoxZone({
            coords = coords,
            size = vec3(1.5, 1.5, 1.5),
            rotation = 0,
            debug = false,
            options = {
                {
                    name = 'police_training',
                    icon = 'fas fa-graduation-cap',
                    label = 'Access CRAP',
                    groups = Config.PoliceJob,
                    onSelect = function()
                        OpenTrainingSystem()
                    end
                }
            }
        })
    end
end)

function OpenTrainingSystem()
    if isTrainingOpen then return end
    
    local PlayerData = QBCore.Functions.GetPlayerData()
    local isFTO = false
    
    for _, grade in ipairs(Config.FTOGrades) do
        if PlayerData.job.grade.level == grade then
            isFTO = true
            break
        end
    end
    
    isTrainingOpen = true
    SetNuiFocus(true, true)
    
    SendNUIMessage({
        action = "open",
        isFTO = isFTO,
        resourceName = GetCurrentResourceName(),
        playerData = {
            name = PlayerData.charinfo.firstname .. " " .. PlayerData.charinfo.lastname,
            citizenId = PlayerData.citizenid,
            jobGrade = PlayerData.job.grade.level
        },
        config = {
            phases = Config.TrainingPhases,
            examQuestions = Config.ExamQuestions,
            passingScore = Config.ExamPassingScore
        }
    })
    
    -- Load data
    if isFTO then
        QBCore.Functions.TriggerCallback('police:training:getAll', function(records)
            SendNUIMessage({
                action = "loadRecords",
                records = records
            })
        end)
    else
        QBCore.Functions.TriggerCallback('police:training:getMyTraining', function(record)
            if record then
                SendNUIMessage({
                    action = "loadMyRecord",
                    record = record
                })
            end
        end)
    end
end

-- NUI Callbacks
RegisterNUICallback('close', function(data, cb)
    isTrainingOpen = false
    SetNuiFocus(false, false)
    cb('ok')
end)

RegisterNUICallback('addCadet', function(data, cb)
    TriggerServerEvent('police:training:addCadet', data)
    cb('ok')
end)

RegisterNUICallback('updateProgress', function(data, cb)
    TriggerServerEvent('police:training:updateProgress', data.citizenId, data.trainingData)
    cb('ok')
end)

RegisterNUICallback('addComment', function(data, cb)
    TriggerServerEvent('police:training:updateComment', data.citizenId, data.comment)
    cb('ok')
end)

RegisterNUICallback('submitExam', function(data, cb)
    TriggerServerEvent('police:training:submitExam', data.citizenId, data.score, data.passed)
    cb('ok')
end)

RegisterNUICallback('completeTraining', function(data, cb)
    TriggerServerEvent('police:training:complete', data.citizenId)
    cb('ok')
end)

RegisterNUICallback('deleteRecord', function(data, cb)
    TriggerServerEvent('police:training:delete', data.citizenId)
    cb('ok')
end)

RegisterNUICallback('getCadetDetails', function(data, cb)
    QBCore.Functions.TriggerCallback('police:training:getCadet', function(record)
        cb(record)
    end, data.citizenId)
end)

-- Refresh training list
RegisterNetEvent('police:training:refresh', function()
    QBCore.Functions.TriggerCallback('police:training:getAll', function(records)
        SendNUIMessage({
            action = "loadRecords",
            records = records
        })
    end)
end)

-- Command to open training (alternative to ox_target)
RegisterCommand('training', function()
    local PlayerData = QBCore.Functions.GetPlayerData()
    if PlayerData.job.name == Config.PoliceJob then
        OpenTrainingSystem()
    else
        QBCore.Functions.Notify('You are not a police officer', 'error')
    end
end)
