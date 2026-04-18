"""
All API Routes — registered as a single APIRouter in main.py
"""
from fastapi import APIRouter

from .country   import router as country_router
from .data      import router as data_router
from .amenities import router as amenities_router
from .business_units import router as bu_router
from .predict   import router as predict_router
from .results   import router as results_router

api_router = APIRouter(prefix="/api")
api_router.include_router(country_router)
api_router.include_router(data_router)
api_router.include_router(amenities_router)
api_router.include_router(bu_router)
api_router.include_router(predict_router)
api_router.include_router(results_router)
