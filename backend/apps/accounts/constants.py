# backend/apps/accounts/constants.py

DEFAULT_MESSAGES = {
    # 🔴 ERROR CODES
    "ERRORS": {
        # Change Password
        "EC001": "Wrong old password.",
        "EF003": "New password and confirm password do not match.",

        # Address
        "EA003": "Invalid characters.",
        "EA004": "This field is required.",
        "EA005": "Pincode must be alphanumeric.",
        "EA006": "Invalid pincode.",
        "EA007": "Invalid postal code.",
        "EA008": "Pincode required.",
        "EA011": "Unable to save address. Please try again.",
        "EA012": "Unexpected error while saving address.",
        "EA013": "Postal lookup failed.",
        "EA014": "Postal API connection error.",

        # Registration & Login
        "EP016": "Username already exists.",
        "ES003": "Email already exists.",
        "EL001": "Invalid credentials. Please try again.",

        # General / Network / Server
        "EA009": "Server not reachable. Please try again later.",
        "EA010": "An unexpected error occurred. Please try again.",
        "EF001": "Email not registered.",
"EF002": "OTP must contain 6 digits.",
"EF003": "New password and confirm password do not match.",
"EF004": "Session ended. Please request a new code.",
"EF005": "Invalid verification code.",
"EF006": "Failed to update password. Please try again.",
"EA010": "An unexpected error occurred. Please try again.",
        
    },

    # 🟡 VALIDATION CODES
    "VALIDATIONS": {
        "VA001": "Only alphabets allowed.",
        "VA002": "Field cannot be empty.",
        "VA003": "Max 50 characters allowed.",
        "VA004": "Invalid input provided.",
        "VA005": "Invalid email format.",
        "VA006": "Phone number must be numeric.",
        "VA007": "Phone number must have 10 digits.",
        "VA008": "Password must be at least 6 characters.",
        "VA009": "Password cannot be same as old password.",
        "VA010": "OTP must contain only digits.",
    },

    # 🟢 INFORMATION CODES (Success Messages)
    "INFORMATION": {
        # Change Password
        "ICP001": "Password changed successfully????.",

        # Address
        "IA001": "Address added successfully.",
        "IA002": "Address updated successfully.",
        "IA003": "Address deleted successfully.",
        "IA004": "Edit Address",
        "IA005": "Add Address",
        "IA006": "Saving...",

        # Profile / Registration
        "IP001": "Profile updated successfully.",
        "IR001": "Account created successfully.",
        "IR002": "Verification link sent successfully.",
        "IR004": "Account already verified.",

        # Login / Logout
        "IL001": "Login successful.",
        "IL002": "Logout successful.",

        # OTP / Forgot Password
        "IV001": "OTP verified successfully.",
        "IF001": "Password reset link sent successfully.",
        "IF002": "Code sent successfully.",
        "IF003": "Password reset successfully.",

        # General
        "IG001": "Operation completed successfully.",
        "IG002": "Data fetched successfully.",
        "IF001": "Enter the verification code sent to your email.",
        "IF004": "Verification Details",
        "IF005": "Password reset successfully!",
        "IF006": "Enter the verification code sent to your email.",
        "IFP001": "Enter new password",
        "IFP002": "Confirm new password",

    },
}
