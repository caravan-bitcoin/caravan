FROM caravanbitcoin/coordinator:latest

# Remove the default nginx site config
RUN rm -f /etc/nginx/conf.d/default.conf

# Add the nginx template and entrypoint
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
