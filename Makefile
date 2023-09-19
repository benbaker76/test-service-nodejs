NAME = benbaker76/test-service-nodejs
VERSION = 0.1

all: build

build:
	@docker build -t $(NAME):$(VERSION) .

run: 
	@docker run -p 5001:5001 --rm $(NAME):$(VERSION)

tag: 
	@docker tag $(NAME):$(VERSION) $(NAME):latest
    
push: 
	@docker push $(NAME)
	
rmi: 
	@docker rmi $(NAME):$(VERSION) $(NAME):latest