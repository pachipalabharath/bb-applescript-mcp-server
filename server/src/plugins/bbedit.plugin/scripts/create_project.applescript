(*
	Create BBEdit Project
	Creates a new project with optional files and folders
	
	Template Variables:
		${name} - Project name (required)
		${location} - Save location (optional, default: ~/Documents/BBEdit Projects/)
		${itemsJson} - JSON array of file/folder paths to add (optional)
		${settingsJson} - JSON object with project settings (optional)
		${shouldOpen} - Whether to open the project after creation (optional, default: true)
*)

tell application "BBEdit"
	-- Create default save location if none provided
	set saveLocation to ${location}
	if saveLocation is missing value or saveLocation is "" then
		set saveLocation to (path to documents folder as text) & "BBEdit Projects:"
		-- Ensure the directory exists
		try
			do shell script "mkdir -p " & quoted form of POSIX path of (saveLocation as alias)
		end try
	end if
	
	-- Build project file path
	set projectName to ${name}
	set projectFileName to projectName & ".bbprojectd"
	set projectPath to saveLocation & projectFileName
	
	-- Create the project
	set newProject to make new project document with properties {name:projectName}
	
	-- Add items to project if provided
	set itemsList to ${itemsJson}
	if itemsList is not missing value and itemsList is not "[]" then
		repeat with itemPath in itemsList
			set itemPath to itemPath as text
			-- Remove quotes and brackets if present
			if itemPath starts with "[" then set itemPath to text 2 thru -2 of itemPath
			if itemPath starts with "\"" then set itemPath to text 2 thru -2 of itemPath
			
			if itemPath is not "" then
				try
					set itemFile to POSIX file itemPath as alias
					
					-- Check if it's a folder or file
					tell application "System Events"
						if class of (info for itemFile) is folder then
							-- Add folder to project
							tell application "BBEdit"
								add itemFile to newProject
							end tell
						else
							-- Add file to project
							tell application "BBEdit"
								add itemFile to newProject
							end tell
						end if
					end tell
				on error errMsg
					-- Skip items that can't be added
					-- Log could be added here in future
				end try
			end if
		end repeat
	end if
	
	-- Apply settings if provided
	set projectSettings to ${settingsJson}
	-- Settings handling can be expanded in future
	-- For now, we just create the basic project
	
	-- Save the project
	try
		set saveFile to POSIX file (POSIX path of saveLocation & projectFileName)
		save newProject to saveFile
	on error errMsg
		return "Error: Failed to save project - " & errMsg
	end try
	
	-- Get saved path
	set savedPath to POSIX path of (file of newProject as alias)
	
	-- Optionally open the project
	set shouldOpenProject to ${shouldOpen}
	if shouldOpenProject is missing value or shouldOpenProject is true then
		-- Project is already open when created
		activate
	else
		-- Close the project window if user doesn't want it open
		try
			close newProject
		end try
	end if
	
	-- Return success with project info
	return "{\"success\":true,\"projectName\":\"" & projectName & "\",\"projectPath\":\"" & savedPath & "\"}"
end tell
