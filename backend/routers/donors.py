from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from core.database import get_db
from schemas.donor import DonorCreate

router = APIRouter(tags=["Donor Registry"])


def clean_doc(doc: dict | None) -> dict | None:
    if not doc:
        return doc
    clean = dict(doc)
    if "_id" in clean:
        clean["_id"] = str(clean["_id"])
    return clean


def clean_docs(docs) -> list:
    return [clean_doc(d) for d in docs]


@router.post("/api/donors")
async def register_donor(payload: DonorCreate, db=Depends(get_db)):
    clean_bg = payload.blood_group.replace(" ", "+").strip().upper()
    donors_col = db["donors"]
    existing = donors_col.find_one({"email": payload.email})
    if existing:
        donors_col.update_one(
            {"email": payload.email},
            {
                "$set": {
                    "name": payload.name,
                    "phone": payload.phone,
                    "blood_group": clean_bg,
                    "location": payload.location.title(),
                    "is_available": payload.is_available,
                }
            },
        )
        updated = donors_col.find_one({"email": payload.email})
        return {"message": "Donor profile updated successfully", "donor": clean_doc(updated)}

    new_id = (donors_col.count_documents({}) if hasattr(donors_col, "count_documents") else donors_col.count()) + 1
    donor_doc = {
        "id": new_id,
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "blood_group": clean_bg,
        "location": payload.location.title(),
        "is_available": payload.is_available,
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }
    donors_col.insert_one(donor_doc)
    return {"message": "Donor registered successfully", "donor": donor_doc}


@router.get("/api/donors")
async def list_donors(
    blood_group: str | None = Query(None),
    location: str | None = Query(None),
    db=Depends(get_db),
):
    donors_col = db["donors"]
    query = {}
    if blood_group and blood_group != "ALL":
        clean_bg = blood_group.replace(" ", "+").strip().upper()
        query["blood_group"] = clean_bg
    if location:
        query["location"] = {"$regex": location.strip(), "$options": "i"}

    donors = donors_col.find(query)
    donors = sorted(donors, key=lambda x: str(x.get("registered_at", "")), reverse=True)
    return {"donors": clean_docs(donors), "total": len(donors)}


@router.patch("/api/donors/{donor_id}/toggle-availability")
async def toggle_donor_availability(donor_id: int, db=Depends(get_db)):
    donors_col = db["donors"]
    donor = donors_col.find_one({"id": donor_id})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    new_avail = not donor.get("is_available", True)
    donors_col.update_one({"id": donor_id}, {"$set": {"is_available": new_avail}})
    updated = donors_col.find_one({"id": donor_id})
    return {"message": f"Donor availability set to {new_avail}", "donor": updated}


@router.delete("/api/donors/{donor_id}")
async def delete_donor(donor_id: int, db=Depends(get_db)):
    donors_col = db["donors"]
    donor = donors_col.find_one({"id": donor_id})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    donors_col.delete_one({"id": donor_id})
    return {"message": f"Donor '{donor['name']}' removed from registry"}
