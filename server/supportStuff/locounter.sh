{
  find ../../server/config/ \
       ../../server/dbAccessFunctions/ \
       ../../server/dbModel/ \
       ../../server/routes/ \
       ../../server/*.js \
       ../../src/ \
       \( -name "*.html" -o -name "*.css" -o -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.sh" \) -type f
  echo "../../server/supportStuff/locounter.sh"
} | xargs wc -l | awk '{if (NF > 1) printf "%s,%s\n", $1, $2; else print $0}'