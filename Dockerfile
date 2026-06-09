FROM nginx:alpine

# Copy custom configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static website files into Nginx public directory
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Run nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]
