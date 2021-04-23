// ffmpeg -i test.mp4 -filter_complex "[0:v]scale=1920:1080[v0]" -map[v0] -c copy -bsf:v h264_mp4toannexb -f mpegts t1.ts
ffmpeg -i t.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts t.ts
ffmpeg -i a.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts a.ts

					
ffmpeg -i t.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts t1.ts
// ffmpeg -i t.mp4 -f mpegts -b:a 160k -ar 44100 t.ts

ffmpeg -i "concat:a.ts|b.ts|c.ts" -c copy -bsf:a aac_adtstoasc -vf "scale=1920:1080,setdar=16/9" -r 60 testout.mp4
// ffmpeg -i "concat:a.ts|t.ts" -c copy -r 60 testout.mp4

ffmpeg -i outro.avi -b:v 8000k -b:a 160k -ar 44100 outro.mp4
ffmpeg -i t.ts -b:v 8000k -b:a 160k -ar 44100 -vf "scale=1920:1080,setdar=16/9" -f mpegts test.ts

ffmpeg -i  a1.ts -b:v  8000k  -b:a  160k  -ar  44100  -vf  "scale=1920:1080,setdar=16/9" -f  mpegts -c:v libx264 a_out.ts