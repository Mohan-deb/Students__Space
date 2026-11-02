# raise when student password doesn't match to the email
class PasswordIncorrect(Exception):
    pass

# raise when student email doesn't found in the database
class EmailNotFound(Exception):
    pass