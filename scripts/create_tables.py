from api.db.session import engine , Base
from api.models.complaint import Complaint

Base.metadata.create_all(bind=engine)
print("Tables created successfully.")