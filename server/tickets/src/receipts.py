import os
import io
import qrcode
from fastapi.responses import StreamingResponse
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from fastapi import HTTPException, status


SECRET_KEY = os.getenv("MAGIC_LINK_SECRET_KEY", "your-very-secret-key")
ALGORITHM = os.getenv("MAGIC_LINK_ALGORITHM", "HS256")

def get_qr_code(token: str):
    """
    Secure QR code generator. 
    Accepts a token, decodes it to find the receipt number, and streams the image.
    """
    try:
        # 1. Decode the token to extract the hidden receipt number
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        receipt_number: str = payload.get("sub")
        
        if receipt_number is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid token data"
            )
            
    except (ExpiredSignatureError, InvalidTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Expired or altered magic link token"
        )

    # 2. Generate the QR code using the verified receipt number
    # (Optional) You can encode the actual view URL inside the QR code instead
    img = qrcode.make(receipt_number)
    
    # 3. Save image to a memory buffer
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    
    # 4. Return stream as a secure image response
    return StreamingResponse(buf, media_type="image/png")