
For /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set date=%%c-%%a-%%b)
For /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set time=%%a%%b)

cd C:\Users\Jon\Projects\smartmeter2

git add -A
git commit -m "automated commit %date%T%time%" 
git push
cmd /k