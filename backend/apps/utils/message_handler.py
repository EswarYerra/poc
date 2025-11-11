# backend/apps/utils/message_handler.py
from apps.accounts.models import UserError, UserInformation, UserValidation
import logging

logger = logging.getLogger(__name__)

def get_message(code):
    """
    Fetch message based on the code prefix (E/I/V).
    Returns dict: { type: 'error'|'info'|'validation', code, message }
    """
    try:
        if not code:
            return {"type": "error", "code": "GEN000", "message": "Code not provided."}

        code = str(code).strip().upper()
        first_letter = code[0]

        if first_letter == "E":
            obj = UserError.objects.filter(error_code__iexact=code).first()
            if obj:
                return {"type": "error", "code": obj.error_code, "message": obj.error_message}

        if first_letter == "I":
            obj = UserInformation.objects.filter(information_code__iexact=code).first()
            if obj:
                return {"type": "info", "code": obj.information_code, "message": obj.information_text}

        if first_letter == "V":
            obj = UserValidation.objects.filter(validation_code__iexact=code).first()
            if obj:
                return {"type": "validation", "code": obj.validation_code, "message": obj.validation_message}

        # not found
        return {"type": "error", "code": "GEN001", "message": "Something went wrong. Please try again."}

    except Exception as e:
        logger.exception("Message handler error for code %s: %s", code, e)
        return {"type": "error", "code": "GEN002", "message": "Unexpected server error."}

