
# raise when student password doesn't match to the email
class StudentPasswordIncorrect(Exception):
    pass

# raise when student email doesn't found in the database
class StudentEmailNotFound(Exception):
    pass