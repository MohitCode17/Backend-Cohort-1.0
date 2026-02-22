#!/bin/bash

# echo "Welcome to Backend Cohort 1.0"

# 👉 VARIABLES

# Always keep variable lowercase
# For Env variables use UPPERCASE

# name="Mohit"
# echo "Welcome, $name!"

# 👉 CONDITIONAL IF-ELSE

# name="Mohit"

# if [ $name == "Mohit" ]; then
#     echo "You are Mohit!"
# else
#     echo "You are not Mohit!"
# fi

# age=20

# if [ $age -gt 18 ]
# then
#   echo "Adult"
# else
#   echo "Minor"
# fi

# -eq : equal
# -ne : not equal 
# -gt : greater
# -lt : less   


# 👉 SINGLE VS DOUBLE QUOTES

# Single quote = literal (exact same print)
# Double quote = For variables and commands

# name="Mohit"
# echo "Welcome, $name"
# echo 'Welcome, $name'


# 👉 FOR LOOP

# for num in 1 2 3 4 5; do
#     echo $num
#     sleep 0.5
# done


# for num in {1..100}; do
#     echo $num
# done


# 👉 LISTS

# languages=("java" "golang" "javascript")

# for item in "${languages[@]}"; do
#     echo $item
# done

# for ((i=0; i < "${#languages[@]}"; i++)); do
#     echo "${languages[i]}"
# done

# 👉 PROGRAM ARGUMENTS
echo $1

# 👉 NAMED ARGUMENTS

# while getopts ":u:p:" opt; do
#     case $opt in
#         u) username="$OPTARG";;
#         p) password="$OPTARG";;
#         \?) echo "Invalid option"
#     esac
# done

# echo "Username: $username"
# echo "Password: $password"

# 👉 PROMPT

# YELLOW='\033[0;33m'
# NC='\033[0m'
# echo -n "Enter your name: "
# read name
# echo -e "${YELLOW}Welcome: $name${NC}"
# echo "hello there"
# read -sp "Enter your password: " password
# echo "Your password: $password"


# 👉 CREATING FILES

# echo "Welcome to backend cohort" > welcome.txt
# cat welcome.txt

# here-document
# cat > welcome.txt << EOL
# Welcome to backend cohort.
# Cohort started on feb 8th
# We are enjoying.
# EOL

# 👉 FOLDERS
# mkdir -p {hello,welcome,nice,config}


# 👉 STRING OPERATIONS
# echo "Hello World" > example.txt

# 👉 STREAM EDITOR (Line by line)
# sed -i '' 's/World/Backend/g' example.txt
