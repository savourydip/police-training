Config = {}

-- Database table name
Config.TableName = 'police_training'

-- Required job to access the system
Config.PoliceJob = 'police'
Config.FTOGrades = {20, 30, 40, 50, 60, 70, 80} -- Grades that can manage training (adjust to your framework)

-- Training Computer Locations (you can add multiple)
Config.ComputerLocations = {
    vector3(455.175232,-997.950439,39.381794), -- Mission Row PD 455.175232,-997.950439,39.381794
    -- Add more locations as needed
}

-- Training Phases Configuration
Config.TrainingPhases = {
    {
        name = "PHASE 1 - INTERVIEW",
        sections = {
            {id = "police_academy", label = "Police Academy / Basic Training", type = "checkbox"}
        }
    },
    {
        name = "PHASE 2 (MIN 3 RIDE ALONG SHIFT) - FILL OUT WITH CALL SIGNS",
        sections = {
            {id = "driving_comms", label = "Driving & Comms", type = "callsign"},
            {id = "firearms", label = "Firearms", type = "callsign"},
            {id = "report_writing", label = "Report Writing", type = "callsign"},
            {id = "citizens_relations", label = "Citizens Relations", type = "callsign"},
            {id = "mdt", label = "MDT", type = "callsign"},
            {id = "arrest_fines_jail", label = "Arrest, Fines & Jail", type = "callsign"},
            {id = "hostage_incidents", label = "Hostage Incidents", type = "callsign"},
            {id = "primary_incident", label = "1x Primary Incident", type = "callsign"},
            {id = "traffic_stop", label = "Traffic Stop", type = "callsign"},
            {id = "radio_dispatch", label = "Radio & Dispatch Use", type = "callsign"},
            {id = "pursuit_training", label = "Pursuit Training", type = "callsign"},
            {id = "hazard_perception", label = "Hazard Perception", type = "callsign"},
            {id = "basic_first_aid", label = "Basic First Aid", type = "callsign"},
            {id = "use_of_force", label = "Use of Force", type = "callsign"},
            {id = "case_law", label = "Case Law", type = "callsign"},
            {id = "ten_codes", label = "Ten Codes", type = "callsign"},
        }
    },
    -- PHASE 3 removed
}

-- Exam Configuration
Config.ExamQuestions = {
    {
        question = "What is the proper radio code for a traffic stop?",
        answers = {"10-38", "10-39", "10-11", "10-23"},
        correct = 3 -- index of correct answer (1-based)
    },
    {
        question = "When pursuing a suspect, what is your primary concern?",
        answers = {"Catching the suspect", "Public safety", "Vehicle damage", "Radio communication"},
        correct = 2
    },
    {
        question = "What should you do before making an arrest?",
        answers = {"Call for backup", "Read Miranda rights", "Check MDT for warrants", "All of the above"},
        correct = 4
    },
    {
        question = "How many ride-along shifts are required in Phase 2?",
        answers = {"2 shifts", "3 shifts", "4 shifts", "5 shifts"},
        correct = 2
    },
    {
        question = "What does Code 3 mean?",
        answers = {"Routine response", "Emergency response with lights and sirens", "Officer needs assistance", "All clear"},
        correct = 2
    }
}

Config.ExamPassingScore = 80 -- Percentage required to pass
